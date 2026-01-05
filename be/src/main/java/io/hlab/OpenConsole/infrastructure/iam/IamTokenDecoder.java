package io.hlab.OpenConsole.infrastructure.iam;

import java.util.Map;

/**
 * IAM 토큰 디코더 인터페이스
 * JWT 토큰을 디코딩하여 사용자 정보와 role을 추출
 * 
 * 구현체는 각 IAM 솔루션별로 제공됨 (예: ZitadelTokenDecoder, KeycloakTokenDecoder)
 */
public interface IamTokenDecoder {

    /**
     * JWT 토큰을 디코딩하여 사용자 정보 추출
     * 
     * @param token JWT 토큰 문자열
     * @return 사용자 정보 (subject, email, name, roles 포함)
     * @throws IamException 토큰 검증 실패 또는 디코딩 실패 시
     */
    IamUserInfo decode(String token) throws IamException;

    /**
     * JWT claims에서 사용자 정보 추출
     * SecurityContext에서 가져온 JWT claims를 IamUserInfo로 변환
     * 
     * @param claims JWT claims (Map<String, Object>)
     * @return 사용자 정보 (subject, email, name, roles 포함)
     */
    IamUserInfo fromClaims(Map<String, Object> claims);

    /**
     * 토큰이 유효한지 검증
     * 
     * @param token JWT 토큰 문자열
     * @return 유효하면 true, 그렇지 않으면 false
     */
    boolean isValid(String token);
}

