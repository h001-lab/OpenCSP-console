package io.hlab.OpenConsole.infrastructure.iam;

/**
 * IAM 관련 예외
 * IAM API 호출 실패, 토큰 검증 실패 등을 표현
 * 
 * <h3>예외 처리 패턴</h3>
 * <p>
 * 이 예외는 예상 가능한 비즈니스 예외로, 다음과 같은 처리 패턴을 따릅니다:
 * </p>
 * <ul>
 *   <li><b>Infrastructure 레이어</b>: IamException을 catch하여 로깅 없이 그대로 전파합니다.
 *       로깅은 전역 예외 핸들러에서 수행하여 중복 로깅을 방지합니다.</li>
 *   <li><b>Application 레이어</b>: IamException을 그대로 전파합니다.</li>
 *   <li><b>API 레이어</b>: IamException을 처리하지 않고 그대로 전파합니다.
 *       전역 예외 핸들러({@link io.hlab.OpenConsole.common.exception.GlobalExceptionHandler})에서 처리됩니다.</li>
 *   <li><b>예상치 못한 예외</b>: Infrastructure 레이어에서 Exception을 catch하여 로깅하고
 *       IamException으로 래핑하여 전파합니다.</li>
 * </ul>
 * 
 * <p>
 * 예시:
 * <pre>{@code
 * // Infrastructure 레이어 (ZitadelClient)
 * try {
 *     userExecutor.findUserByEmail(email);
 * } catch (IamException e) {
 *     throw e;  // 로깅 없이 전파
 * } catch (Exception e) {
 *     log.error("예상치 못한 예외", e);  // 로깅 후 래핑
 *     throw new IamException("처리 실패", e);
 * }
 * 
 * // API 레이어 (RoleController)
 * // try-catch 불필요, GlobalExceptionHandler에서 처리
 * roleService.assignRole(email, role);
 * }</pre>
 * </p>
 */
public class IamException extends RuntimeException {

    public IamException(String message) {
        super(message);
    }

    public IamException(String message, Throwable cause) {
        super(message, cause);
    }
}

