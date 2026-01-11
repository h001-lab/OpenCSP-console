package io.hlab.OpenConsole.infrastructure.iam;

/**
 * IAM Role Enum
 * IAM에서 사용하는 Role을 표현
 */
public enum IamRole {
    ADMIN("admin"),
    USER("user"),  // Zitadel에서 사용하는 기본 user role
    USER_A("userA"),
    USER_B("userB"),
    USER_C("userC");

    private final String value;

    IamRole(String value) {
        this.value = value;
    }

    /**
     * Role 문자열 값을 반환 (IAM API 호출 시 사용)
     * 
     * @return role 문자열 값
     */
    public String getValue() {
        return value;
    }

    /**
     * 문자열로부터 IamRole을 찾음
     * 
     * @param roleString role 문자열
     * @return IamRole 또는 null (없는 경우)
     */
    public static IamRole fromString(String roleString) {
        if (roleString == null || roleString.isBlank()) {
            return null;
        }
        
        for (IamRole role : values()) {
            if (role.value.equalsIgnoreCase(roleString)) {
                return role;
            }
        }
        
        return null;
    }

    /**
     * 문자열로부터 IamRole을 찾음 (of 메서드와 동일, 호환성 유지)
     * 
     * @param roleString role 문자열
     * @return IamRole
     * @throws IllegalArgumentException role이 존재하지 않는 경우
     */
    public static IamRole of(String roleString) {
        IamRole role = fromString(roleString);
        if (role == null) {
            throw new IllegalArgumentException("Unknown role: " + roleString);
        }
        return role;
    }

    @Override
    public String toString() {
        return value;
    }
}

