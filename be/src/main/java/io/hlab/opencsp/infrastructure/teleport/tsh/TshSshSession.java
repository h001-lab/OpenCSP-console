package io.hlab.opencsp.infrastructure.teleport.tsh;

import java.io.Closeable;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;

/**
 * {@code tsh ssh} 프로세스를 실행해 PTY 세션을 제공한다.
 *
 * <p>Teleport는 ALPN WebSocket upgrade 프로토콜을 사용하므로 JSch 직접 연결이 불가하다.
 * tsh 바이너리가 ALPN 처리를 담당하므로 프로세스 stdin/stdout을 파이프한다.
 *
 * <p>임시 구현 — Go Adapter 전환 시 {@code tsh/} 패키지 전체를 삭제한다.
 *
 * <p>MDC context (session_id, console_session_id) must be set by the caller before invoking
 * {@link #connect}. MDC 스냅샷은 {@code connect()} 내부에서 캡처해 stderr 스레드로 전달된다.
 */
@Slf4j
public class TshSshSession implements Closeable {

    private final Process     process;
    private final InputStream stdout;
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
        String tshPath, String proxyAddr, String identityPath,
        String nodeId, String login) throws IOException {

        log.atInfo()
                .addKeyValue("proxy_addr", proxyAddr)
                .addKeyValue("identity_path", identityPath)
                .addKeyValue("teleport_node_id", nodeId)
                .addKeyValue("ssh_login", login)
                .log("tsh ssh 실행");

        ProcessBuilder pb = new ProcessBuilder(
                tshPath, "ssh",
                "--proxy=" + proxyAddr,
                "--identity=" + identityPath,
                "--insecure",
                "--no-resume",
                login + "@" + nodeId
        );
        pb.redirectErrorStream(false);

        Process process = pb.start();

        // stderr 스레드로 MDC 전파 (connect() 호출 스레드의 컨텍스트 캡처)
        Map<String, String> mdc = MDC.getCopyOfContextMap();
        Thread stderrThread = new Thread(() -> {
            if (mdc != null) MDC.setContextMap(mdc);
            try (var err = process.getErrorStream()) {
                byte[] buf = new byte[512];
                int n;
                while ((n = err.read(buf)) != -1) {
                    log.atDebug()
                            .addKeyValue("tsh_stderr", new String(buf, 0, n).stripTrailing())
                            .log("tsh stderr");
                }
            } catch (IOException ignored) {
            } finally {
                MDC.clear();
            }
        }, "tsh-stderr");
        stderrThread.setDaemon(true);
        stderrThread.start();

        log.atInfo()
                .addKeyValue("tsh_pid", process.pid())
                .log("tsh ssh 프로세스 시작");

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
        log.atDebug()
                .addKeyValue("cols", cols)
                .addKeyValue("rows", rows)
                .log("resize 요청 (미지원 — Go Adapter 전환 시 구현)");
    }

    @Override
    public void close() {
        try { stdin.close();  } catch (Exception ignored) {}
        try { stdout.close(); } catch (Exception ignored) {}
        if (process.isAlive()) {
            process.destroy();
            log.atInfo().log("tsh ssh 프로세스 종료");
        }
    }
}
