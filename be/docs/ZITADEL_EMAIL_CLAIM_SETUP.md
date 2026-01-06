# Zitadel JWT에 Email 클레임 포함 설정 가이드

## 문제 상황

JWT 토큰에 `email` 클레임이 포함되지 않아 백엔드에서 사용자 email을 확인할 수 없는 경우가 발생할 수 있습니다.

## 해결 방법

Zitadel 설정에서 JWT 토큰에 email 클레임을 포함하도록 설정해야 합니다.

### 설정 방법

1. **Zitadel Console 접속**
   - Zitadel 관리 콘솔에 로그인

2. **Project 선택**
   - 해당 프로젝트 선택

3. **Application 선택**
   - API 호출에 사용하는 클라이언트 애플리케이션 선택

4. **Token Settings 확인**
   - Application 설정에서 "Token Settings" 또는 "Claims" 섹션으로 이동

5. **User Info 설정**
   - "User Info" 또는 "Claims" 설정에서 다음을 확인:
     - `email` 클레임이 포함되도록 설정
     - 또는 "Include user info in token" 옵션 활성화

6. **Scope 확인**
   - OAuth2 Client 설정에서 `email` scope가 요청되고 있는지 확인
   - 현재 설정: `application.yaml`에서 `scope: [openid, profile, email]` 확인

### 확인 방법

1. **JWT 토큰 디코딩**
   - [jwt.io](https://jwt.io)에서 토큰을 디코딩하여 `email` 클레임이 포함되어 있는지 확인

2. **로그 확인**
   - 백엔드 로그에서 다음 메시지가 나오면 email이 없는 것:
     ```
     WARN Email claim not found in JWT. Available claims: [...]
     ```

### 참고사항

- JWT에 email이 없으면 백엔드에서 사용자 식별이 어려울 수 있습니다
- Management API로 email을 조회할 수 있지만, 매번 API 호출은 성능 오버헤드가 있습니다
- 따라서 Zitadel 설정으로 JWT에 email을 포함하는 것이 권장됩니다

### 예상되는 JWT 구조 (설정 후)

```json
{
  "iss": "https://idp.avgmax.team",
  "sub": "353790545778180099",
  "email": "user@example.com",
  "email_verified": true,
  "aud": [...],
  "exp": 1767494828,
  "iat": 1767451628,
  ...
}
```

