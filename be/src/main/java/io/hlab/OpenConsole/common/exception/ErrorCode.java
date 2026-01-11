package io.hlab.OpenConsole.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // User 관련
    USER_NOT_FOUND("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.", 404),
    USER_ALREADY_EXISTS("USER_ALREADY_EXISTS", "이미 존재하는 사용자입니다.", 409),
    
    // IAM 관련
    IAM_ERROR("IAM_ERROR", "IAM 처리 중 오류가 발생했습니다.", 500),
    IAM_USER_NOT_FOUND("IAM_USER_NOT_FOUND", "IAM에서 사용자를 찾을 수 없습니다.", 404),
    IAM_ROLE_ASSIGN_FAILED("IAM_ROLE_ASSIGN_FAILED", "Role 부여에 실패했습니다.", 500),
    IAM_ROLE_REMOVE_FAILED("IAM_ROLE_REMOVE_FAILED", "Role 제거에 실패했습니다.", 500),
    IAM_ROLE_QUERY_FAILED("IAM_ROLE_QUERY_FAILED", "Role 조회에 실패했습니다.", 500),
    
    // 공통
    INVALID_INPUT("INVALID_INPUT", "잘못된 입력입니다.", 400),
    UNAUTHORIZED("UNAUTHORIZED", "인증이 필요합니다.", 401),
    FORBIDDEN("FORBIDDEN", "접근 권한이 없습니다.", 403),
    INTERNAL_SERVER_ERROR("INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다.", 500);

    private final String code;
    private final String message;
    private final int status;

    public BusinessException toException() {
        return new BusinessException(this.code, this.message, this.status);
    }
}

