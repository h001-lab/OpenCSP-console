package io.hlab.OpenConsole.common.exception;

import lombok.Getter;

@Getter
public class BusinessException extends RuntimeException {
    private final String errorCode;
    private final int status;

    public BusinessException(String errorCode, String message, int status) {
        super(message);
        this.errorCode = errorCode;
        this.status = status;
    }

    public BusinessException(String errorCode, String message) {
        this(errorCode, message, 400);
    }
}

