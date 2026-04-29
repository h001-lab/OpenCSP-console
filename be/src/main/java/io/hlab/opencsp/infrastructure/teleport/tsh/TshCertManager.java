package io.hlab.opencsp.infrastructure.teleport.tsh;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.hlab.opencsp.domain.config.ConfigCategory;
import io.hlab.opencsp.infrastructure.config.ConfigStore;
import io.hlab.opencsp.infrastructure.teleport.TeleportNodeInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

/**
 * tsh 바이너리를 이용해 Teleport SSH 인증서를 발급·캐시한다.
 *
 * <p>임시 구현 — Go Adapter 전환 시 {@code tsh/} 패키지 전체를 삭제한다.
 *
 * <p>ConfigStore IAM 키:
 * <ul>
 *   <li>{@code teleport.proxy.url}  — Teleport 프록시 주소</li>
 *   <li>{@code teleport.bot.user}   — tsh 로그인 계정</li>
 *   <li>{@code teleport.bot.pass}   — tsh 로그인 비밀번호</li>
 *   <li>{@code teleport.tsh.path}   — tsh 바이너리 경로 (기본: tsh)</li>
 *   <li>{@code teleport.tsh.ttl}    — 인증서 TTL (기본: 12h)</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TshCertManager {

    private final ConfigStore configStore;

    /** 인증서 만료 30분 전 갱신 */
    private static final long REFRESH_MARGIN_SECONDS = 30 * 60;

    private final AtomicReference<Instant> certExpiry = new AtomicReference<>(Instant.EPOCH);

    /**
     * 인증서 파일이 존재하면 그대로 사용, 없으면 tsh login 시도.
     * MFA가 필요한 환경에서는 수동으로 {@code tsh login}을 먼저 실행해야 한다.
     */
    public void ensureCert() {
        String identityPath = configStore.get(ConfigCategory.IAM, "teleport.identity.path", 
                                    "/var/pam/identity/identity");
        if (!Paths.get(identityPath).toFile().exists()) {
            throw new IllegalStateException(
                "Teleport identity 파일이 없습니다: " + identityPath + 
                " (tbot 사이드카가 정상 동작 중인지 확인하세요)");
        }
    }

    /**
     * tsh private key 파일 경로.
     * 예: ~/.tsh/keys/teleport.avgmax.team/opencsp-bot
     */
    public Path privateKeyPath() {
        String proxyHost = proxyHost();
        String user      = configStore.get(ConfigCategory.IAM, "teleport.bot.user", "");
        return Paths.get(System.getProperty("user.home"), ".tsh", "keys", proxyHost, user);
    }

    /**
     * tsh SSH 인증서 파일 경로.
     * 예: ~/.tsh/keys/teleport.avgmax.team/opencsp-bot-ssh/teleport.avgmax.team-cert.pub
     */
    public Path sshCertPath() {
        String proxyHost = proxyHost();
        String user      = configStore.get(ConfigCategory.IAM, "teleport.bot.user", "");
        return Paths.get(System.getProperty("user.home"), ".tsh", "keys", proxyHost,
                user + "-ssh", proxyHost + "-cert.pub");
    }

    /** tsh 바이너리 경로 */
    public String tshPath() {
        return configStore.get(ConfigCategory.IAM, "teleport.tsh.path", "tsh");
    }

    /** tsh --proxy 인수용 주소 (host:port) */
    public String proxyAddr() {
        return proxyHost() + ":" + sshProxyPort();
    }

    /** tsh 프록시 호스트 (포트 제외) */
    public String proxyHost() {
        String proxyUrl = configStore.get(ConfigCategory.IAM, "teleport.proxy.url", "");
        return proxyUrl.replaceFirst("^https?://", "").replaceFirst("/.*", "").replaceFirst(":.*", "");
    }

    /**
     * Teleport SSH Proxy 포트.
     * ConfigStore IAM 키 {@code teleport.ssh.port} 로 오버라이드 가능.
     * 기본값 443 (ALPN multiplexing — Kubernetes 배포 환경).
     * 전통적 배포는 3023.
     */
    public int sshProxyPort() {
        String port = configStore.get(ConfigCategory.IAM, "teleport.ssh.port", "443");
        try {
            return Integer.parseInt(port);
        } catch (NumberFormatException e) {
            return 443;
        }
    }

    /**
     * tsh ls --format=json 으로 노드를 조회한다.
     * 임시 구현 — Go Adapter 전환 시 제거.
     */
    public Optional<TeleportNodeInfo> findNodeByHostname(String hostname) {
        String tshPath   = configStore.get(ConfigCategory.IAM, "teleport.tsh.path", "tsh");
        String proxyAddr = configStore.get(ConfigCategory.IAM, "teleport.proxy.url", "")
                .replaceFirst("^https?://", "");
        String identityPath = configStore.get(ConfigCategory.IAM, "teleport.identity.path", 
                    "/var/pam/identity/identity");
        String cluster   = proxyHost();
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    tshPath, "ls",
                    "--proxy=" + proxyAddr,
                    "--identity=" + identityPath,
                    "--format=json",
                    "--insecure"
            );
            pb.redirectErrorStream(false);
            Process process = pb.start();
            String output   = new String(process.getInputStream().readAllBytes());
            String stderr = new String(process.getErrorStream().readAllBytes());
            int exitCode = process.waitFor();
        
            if (exitCode != 0) {
                log.atWarn()
                    .addKeyValue("hostname", hostname)
                    .addKeyValue("exit_code", exitCode)
                    .addKeyValue("stderr", stderr)
                    .log("tsh ls 실패");
                return Optional.empty();
            }

            ObjectMapper mapper = new ObjectMapper();
            JsonNode nodes = mapper.readTree(output);
            if (nodes.isArray()) {
                for (JsonNode node : nodes) {
                    String nodeHostname = node.path("spec").path("hostname").asText(
                            node.path("metadata").path("name").asText(""));
                    if (hostname.equalsIgnoreCase(nodeHostname)) {
                        String id = node.path("metadata").path("name").asText();
                        return Optional.of(TeleportNodeInfo.builder()
                                .id(id)
                                .hostname(nodeHostname)
                                .addr(node.path("spec").path("addr").asText(""))
                                .clusterName(cluster)
                                .build());
                    }
                }
            }
            log.atWarn().addKeyValue("hostname", hostname).log("노드를 찾을 수 없음");
            return Optional.empty();
        } catch (Exception e) {
            log.atError().addKeyValue("hostname", hostname).setCause(e).log("노드 조회 실패");
            return Optional.empty();
        }
    }

    // ──────────────────────────────────────────────────────────────────────────

    private synchronized void refreshCert() {
        // 이중 체크
        if (Instant.now().plusSeconds(REFRESH_MARGIN_SECONDS).isBefore(certExpiry.get())) {
            return;
        }

        String tshPath  = configStore.get(ConfigCategory.IAM, "teleport.tsh.path", "tsh");
        String proxyUrl = configStore.get(ConfigCategory.IAM, "teleport.proxy.url", "");
        String user     = configStore.get(ConfigCategory.IAM, "teleport.bot.user", "");
        String pass     = configStore.get(ConfigCategory.IAM, "teleport.bot.pass", "");
        String ttl      = configStore.get(ConfigCategory.IAM, "teleport.tsh.ttl", "12h");

        // 프록시 주소에서 프로토콜 제거
        String proxyAddr = proxyUrl.replaceFirst("^https?://", "");

        log.atInfo()
                .addKeyValue("proxy_addr", proxyAddr)
                .addKeyValue("tsh_user", user)
                .addKeyValue("tsh_ttl", ttl)
                .log("tsh login 실행");
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    tshPath, "login",
                    "--proxy=" + proxyAddr,
                    "--auth=local",
                    "--user=" + user,
                    "--ttl=" + ttl,
                    "--insecure"          // self-signed 허용 (개발 환경)
            );
            pb.environment().put("TSH_PASSWORD", pass);
            pb.redirectErrorStream(true);

            Process process = pb.start();
            String output = new String(process.getInputStream().readAllBytes());
            int exitCode  = process.waitFor();

            if (exitCode != 0) {
                throw new IllegalStateException("tsh login 실패 (exitCode=" + exitCode + "): " + output);
            }

            log.atInfo().log("tsh login 완료");
            certExpiry.set(Instant.now().plusSeconds(parseTtlToSeconds(ttl)));

        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("tsh login 실행 중 오류", e);
        }
    }

    private static long parseTtlToSeconds(String ttl) {
        // "12h" → 43200, "30m" → 1800
        if (ttl.endsWith("h")) return Long.parseLong(ttl.replace("h", "")) * 3600;
        if (ttl.endsWith("m")) return Long.parseLong(ttl.replace("m", "")) * 60;
        return 43200; // 기본 12h
    }
}
