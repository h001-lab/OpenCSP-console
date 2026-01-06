# JWT Role 클레임 확인 가이드

## Step 1: JWT 토큰 발급 및 확인

### 1. JWT 토큰 발급 방법

**방법 1: Swagger UI에서 로그인**
1. Swagger UI 접속: `http://localhost:8080/swagger-ui.html`
2. 브라우저에서 `http://localhost:8080/oauth2/authorization/zitadel` 접속
3. Zitadel 로그인 완료

**방법 2: 프론트엔드에서 로그인**
- 프론트엔드에서 Zitadel 로그인 후 토큰 확인

**방법 3: 브라우저 개발자 도구**
1. F12 → Application/Storage 탭
2. Local Storage 또는 Session Storage에서 토큰 확인
3. 또는 Network 탭에서 API 요청의 `Authorization` 헤더 확인

### 2. JWT 토큰 디코딩

1. **https://jwt.io/** 접속
2. **Encoded** 필드에 토큰 붙여넣기 (Bearer 제거)
3. **Decoded** 섹션에서 확인

### 3. 확인할 사항

#### Payload 섹션에서 확인:
- `sub`: 사용자 ID (subject)
- `email`: 이메일
- **Role 클레임 위치** (아래 중 하나일 가능성):
  - `roles`: `["admin", "userA"]` 형태?
  - `urn:zitadel:iam:org:project:roles`: `["admin", "userA"]` 형태?
  - 다른 경로?

#### Role 값 형식 확인:
- 소문자: `["admin", "userA", "userB", "userC"]`?
- 대문자: `["ADMIN", "USER_A", "USER_B", "USER_C"]`?
- 다른 형식?

## Step 2: 확인 결과를 코드에 반영

확인한 정보를 알려주시면 코드를 조정하겠습니다.

### 확인해야 할 정보:
1. Role 클레임의 키 이름 (예: `roles`, `urn:zitadel:iam:org:project:roles`)
2. Role 값 형식 (예: `"admin"`, `"ADMIN"`, `"userA"`, `"USER_A"`)
3. Role 값이 배열인지 단일 값인지

