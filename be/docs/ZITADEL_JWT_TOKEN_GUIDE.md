# Zitadel JWT 토큰 발급 가이드

Zitadel에서 JWT 토큰을 발급받는 여러 방법을 안내합니다.

## 1. OAuth2 로그인 플로우를 통한 토큰 발급 (가장 일반적)

### 방법 1: 브라우저 개발자 도구 사용

1. **프론트엔드에서 Zitadel 로그인**
   - 프론트엔드 애플리케이션에서 Zitadel 로그인 수행
   - 또는 백엔드의 OAuth2 로그인 엔드포인트 직접 접근:
     ```
     http://localhost:8080/oauth2/authorization/zitadel
     ```

2. **브라우저 개발자 도구 열기**
   - F12 또는 우클릭 → 검사
   - **Application** 탭 (Chrome) 또는 **Storage** 탭 (Firefox)

3. **토큰 확인**
   - **Local Storage** 또는 **Session Storage**에서 토큰 확인
   - 또는 **Network** 탭에서 API 요청의 `Authorization` 헤더 확인

### 방법 2: Network 탭에서 확인

1. **로그인 후 API 호출**
   - 프론트엔드에서 로그인 후 API 호출

2. **Network 탭 확인**
   - 개발자 도구 → **Network** 탭
   - API 요청 선택
   - **Headers** → **Request Headers**에서 `Authorization: Bearer <token>` 확인

### 방법 3: 백엔드 로그인 엔드포인트 직접 사용

1. **로그인 URL 접근**
   ```
   http://localhost:8080/oauth2/authorization/zitadel
   ```
   - 이 URL로 접근하면 Zitadel 로그인 페이지로 리다이렉트됨

2. **로그인 완료 후**
   - 로그인 성공 후 세션에 토큰이 저장됨
   - 하지만 백엔드 API 호출 시에는 이 토큰을 직접 사용하기 어려움
   - 프론트엔드에서 이 토큰을 추출하여 사용

## 2. Zitadel Management API를 통한 토큰 발급

서비스 계정(Service Account)을 사용하여 토큰을 발급받는 방법입니다.

### 사전 준비

1. **Zitadel에서 Service Account 생성**
   - Zitadel 콘솔 → **Service Users** → **New Service User**
   - Personal Access Token 생성

2. **환경 변수 설정**
   ```bash
   ZITADEL_DOMAIN=your-zitadel-domain.com
   ZITADEL_SERVICE_TOKEN=your-personal-access-token
   ```

### curl을 사용한 토큰 발급

```bash
curl -X POST "https://${ZITADEL_DOMAIN}/oauth/v2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=${ZITADEL_CLIENT_ID}" \
  -d "client_secret=${ZITADEL_CLIENT_SECRET}" \
  -d "scope=openid profile email"
```

응답 예시:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### Postman을 사용한 토큰 발급

1. **새 요청 생성**
   - Method: `POST`
   - URL: `https://${ZITADEL_DOMAIN}/oauth/v2/token`

2. **Headers 설정**
   - `Content-Type: application/x-www-form-urlencoded`

3. **Body 설정 (x-www-form-urlencoded)**
   - `grant_type`: `client_credentials`
   - `client_id`: `${ZITADEL_CLIENT_ID}`
   - `client_secret`: `${ZITADEL_CLIENT_SECRET}`
   - `scope`: `openid profile email`

4. **응답에서 `access_token` 추출**

## 3. Zitadel CLI 사용 (선택사항)

Zitadel CLI를 설치하여 토큰을 발급받을 수 있습니다.

### 설치

```bash
# macOS/Linux
brew install zitadel/zitadel/zitadel

# 또는 직접 다운로드
# https://github.com/zitadel/zitadel/releases
```

### 사용

```bash
zitadel login \
  --issuer https://${ZITADEL_DOMAIN} \
  --client-id ${ZITADEL_CLIENT_ID} \
  --client-secret ${ZITADEL_CLIENT_SECRET}

# 토큰 확인
zitadel token
```

## 4. 프론트엔드에서 토큰 추출

프론트엔드에서 로그인 후 토큰을 추출하는 방법:

### JavaScript 예시

```javascript
// OAuth2 로그인 후
const token = localStorage.getItem('access_token');
// 또는
const token = sessionStorage.getItem('access_token');

// API 호출 시 사용
fetch('http://localhost:8080/users/api/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 5. 토큰 검증 및 내용 확인

발급받은 JWT 토큰의 내용을 확인하려면:

### JWT.io 사용

1. **https://jwt.io/** 접속
2. **Encoded** 필드에 토큰 붙여넣기
3. **Decoded** 섹션에서 토큰 내용 확인
   - `sub`: 사용자 ID
   - `email`: 이메일
   - `roles`: 역할 목록
   - `exp`: 만료 시간

### 커맨드라인으로 확인

```bash
# JWT 토큰 디코딩 (base64)
echo "YOUR_JWT_TOKEN" | cut -d. -f2 | base64 -d

# 또는 jq 사용
echo "YOUR_JWT_TOKEN" | cut -d. -f2 | base64 -d | jq .
```

## 6. 테스트용 토큰 발급 (개발 환경)

개발/테스트 목적으로 간단하게 토큰을 발급받는 방법:

### Postman Collection 사용

1. **Postman에서 새 Collection 생성**
2. **Pre-request Script 추가**:
   ```javascript
   pm.sendRequest({
       url: pm.environment.get("ZITADEL_ISSUER_URI") + "/oauth/v2/token",
       method: 'POST',
       header: {
           'Content-Type': 'application/x-www-form-urlencoded'
       },
       body: {
           mode: 'urlencoded',
           urlencoded: [
               {key: 'grant_type', value: 'client_credentials'},
               {key: 'client_id', value: pm.environment.get("ZITADEL_CLIENT_ID")},
               {key: 'client_secret', value: pm.environment.get("ZITADEL_CLIENT_SECRET")},
               {key: 'scope', value: 'openid profile email'}
           ]
       }
   }, function (err, res) {
       if (err) {
           console.log(err);
       } else {
           var jsonData = res.json();
           pm.environment.set("access_token", jsonData.access_token);
       }
   });
   ```

3. **Collection의 Authorization 설정**
   - Type: `Bearer Token`
   - Token: `{{access_token}}`

## 7. 주의사항

1. **토큰 만료 시간**
   - 일반적으로 1시간 (3600초)
   - 만료되면 새로 발급받아야 함

2. **토큰 보안**
   - 토큰을 공개 저장소에 커밋하지 마세요
   - 환경 변수나 시크릿 관리 도구 사용

3. **Role 확인**
   - 토큰에 포함된 role이 올바른지 확인
   - JWT.io에서 `roles` 클레임 확인

4. **환경별 토큰**
   - 개발/스테이징/프로덕션 환경별로 다른 토큰 사용

## 8. 문제 해결

### 토큰이 유효하지 않음

- 토큰이 만료되었는지 확인
- Zitadel의 issuer-uri가 올바른지 확인
- 클라이언트 ID/Secret이 올바른지 확인

### Role이 토큰에 없음

- Zitadel에서 사용자에게 role이 할당되었는지 확인
- 토큰 발급 시 올바른 scope를 요청했는지 확인
- Zitadel 프로젝트 설정에서 role이 올바르게 구성되었는지 확인

### 403 Forbidden 에러

- 토큰의 role이 API 접근에 필요한 role과 일치하는지 확인
- `SecurityConfig.extractRoles()` 메서드가 올바른 클레임 경로를 확인하는지 확인

