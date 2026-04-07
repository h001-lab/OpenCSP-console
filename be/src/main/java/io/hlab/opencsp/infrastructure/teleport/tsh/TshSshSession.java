package io.hlab.opencsp.infrastructure.teleport.tsh;

import lombok.extern.slf4j.Slf4j;

import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * {@code tsh ssh} 프로세스를 실행해 PTY 세션을 제공한다.
 *
 * <p>Teleport는 ALPN WebSocket upgrade 프로토콜을 사용하므로 JSch 직접 연결이 불가하다.
 * tsh 바이너리가 ALPN 처리를 담당하므로 프로세스 stdin/stdout을 파이프한다.
 *
 * <p>임시 구현 — Go Adapter 전환 시 {@code tsh/} 패키지 전체를 삭제한다.
 */
@Slf4j
public class TshSshSession implements Closeable {

    private final Process    process;
    private final InputStream  stdout;
    private final OutputStream stdin;

    private TshSshSession(Process process) {
        this.process = process;
        this.stdout  = process.getInputStream();
        this.stdin   = process.getOutputStream();
    }

    /**
     * {@code tsh ssh} 프로세스를 실행하고 PTY 세션을 연다.
     *
     * @param tshPath   tsh 바이너리 경로
     * @param proxyAddr Teleport 프록시 주소 (포트 포함, 예: teleport.avgmax.team:443)
     * @param nodeId    Teleport 노드 UUID 또는 hostname
     * @param login     SSH 로그인 계정 (root 등)
     */
    public static TshSshSession connect(
            String tshPath, String proxyAddr, String nodeId, String login) throws IOException {

        log.info("[tsh] tsh ssh 실행: proxy={}, node={}, login={}", proxyAddr, nodeId, login);

        ProcessBuilder pb = new ProcessBuilder(
                tshPath, "ssh",
                "--proxy=" + proxyAddr,
                "--insecure",
                "--no-resume",       // 재연결 시도 비활성화 (단순 파이프용)
                login + "@" + nodeId
        );
        pb.redirectErrorStream(false); // stderr는 분리 (로그용)

        Process process = pb.start();

        // stderr 비동기 소비 (로그 출력)
        Thread stderrThread = new Thread(() -> {
            try (var err = process.getErrorStream()) {
                byte[] buf = new byte[512];
                int n;
                while ((n = err.read(buf)) != -1) {
                    log.debug("[tsh][stderr] {}", new String(buf, 0, n).stripTrailing());
                }
            } catch (IOException ignored) {}
        }, "tsh-stderr");
        stderrThread.setDaemon(true);
        stderrThread.start();

        log.info("[tsh] tsh ssh 프로세스 시작: pid={}", process.pid());
        return new TshSshSession(process);
    }

    public InputStream  stdout() { return stdout; }
    public OutputStream stdin()  { return stdin; }

    public boolean isAlive() {
        return process.isAlive();
    }

    /**
     * 터미널 크기 변경 — tsh ssh 프로세스에 SIGWINCH 전송.
     * tsh가 SIGWINCH를 처리해 원격 PTY 크기를 변경한다.
     */
    public void resize(int cols, int rows) {
        // tsh ssh는 SIGWINCH를 받으면 원격 PTY를 리사이즈한다.
        // Java에서 직접 SIGWINCH를 보낼 수 없으므로 stty를 통해 처리한다.
        // 실용적 대안: FE 측에서 초기 크기로 고정하거나 나중에 Go Adapter에서 처리.
        log.debug("[tsh] resize 요청 (미지원 — Go Adapter 전환 시 구현): cols={}, rows={}", cols, rows);
    }

    @Override
    public void close() {
        try { stdin.close();  } catch (Exception ignored) {}
        try { stdout.close(); } catch (Exception ignored) {}
        if (process.isAlive()) {
            process.destroy();
            log.info("[tsh] tsh ssh 프로세스 종료");
        }
    }
}
