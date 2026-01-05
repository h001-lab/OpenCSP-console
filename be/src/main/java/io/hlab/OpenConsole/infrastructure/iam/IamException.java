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
 *       로깅은 상위 레이어(Controller)에서 수행하여 중복 로깅을 방지합니다.</li>
 *   <li><b>API 레이어</b>: IamException을 catch하여 로깅하고 사용자에게 적절한 에러 응답을 반환합니다.</li>
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
 * try {
 *     roleService.assignRole(email, role);
 * } catch (IamException e) {
 *     log.error("Role 부여 실패", e);  // 여기서 로깅
 *     return ApiResponse.error("ROLE_ASSIGN_FAILED", e.getMessage());
 * }
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

