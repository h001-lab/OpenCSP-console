package io.hlab.opencsp.domain.console;

public enum ConsoleSessionStatus {
    /** 세션 준비 완료 — WebSocket 연결 대기 중 */
    PENDING,
    /** WebSocket 연결 수립 및 Teleport 프록시 연결 중 */
    CONNECTING,
    /** 터미널 활성 상태 */
    ACTIVE,
    /** 정상 종료 */
    DISCONNECTED,
    /** 오류 종료 */
    FAILED
}
