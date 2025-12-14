package io.hlab.OpenConsole.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    USER_NOT_FOUND("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.", 404),
    USER_ALREADY_EXISTS("USER_ALREADY_EXISTS", "이미 존재하는 사용자입니다.", 409),
    INVALID_INPUT("INVALID_INPUT", "잘못된 입력입니다.", 400),
    INTERNAL_SERVER_ERROR("INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다.", 500);

    private final String code;
    private final String message;
    private final int status;

    public BusinessException toException() {
        return new BusinessException(this.code, this.message, this.status);
    }
}

