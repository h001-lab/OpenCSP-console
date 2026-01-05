package io.hlab.OpenConsole.infrastructure.iam;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.List;

/**
 * IAM에서 추출한 사용자 정보
 * 토큰 디코딩 결과를 담는 값 객체
 */
@Getter
@RequiredArgsConstructor
public class IamUserInfo {
    private final String subject;      // IAM의 고유 사용자 ID (sub)
    private final String email;
    private final String name;
    private final List<IamRole> roles; // 사용자가 가진 역할 목록

    public static IamUserInfo of(String subject, String email, String name, List<IamRole> roles) {
        return new IamUserInfo(subject, email, name, roles);
    }

    public boolean hasRole(IamRole role) {
        return roles.contains(role);
    }

    public boolean hasAnyRole(IamRole... roles) {
        for (IamRole role : roles) {
            if (this.roles.contains(role)) {
                return true;
            }
        }
        return false;
    }
}

