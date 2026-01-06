# Phase 6 단계별 실행 가이드

## Step 1: 환경 준비 및 기본 테스트

### 1-1. 환경 변수 설정

`.env` 파일을 생성하거나 확인하세요. `be/.env.example` 파일을 참고하세요.

필수 환경 변수:
```bash
ZITADEL_DOMAIN=your-zitadel-domain.com
ZITADEL_ORG_ID=your-org-id
ZITADEL_PROJECT_ID=your-project-id
ZITADEL_SERVICE_TOKEN=your-service-token
ZITADEL_ISSUER_URI=https://your-zitadel-domain.com
ZITADEL_CLIENT_ID=your-client-id
ZITADEL_CLIENT_SECRET=your-client-secret
```

### 1-2. 애플리케이션 실행

```bash
cd be
./gradlew bootRun
```

### 1-3. 기본 연결 확인

1. **Swagger UI 접속**
   - `http://localhost:8080/swagger-ui.html` 접속
   - 접속이 되면 기본 연결 성공

2. **로그 확인**
   - 애플리케이션 시작 로그 확인
   - Zitadel 연결 오류가 있는지 확인
   - JWT 검증 오류가 있는지 확인

## Step 2: JWT Role 클레임 경로 확인

### 2-1. JWT 토큰 발급

1. **Zitadel에서 로그인**
   - 프론트엔드에서 로그인하거나
   - `http://localhost:8080/oauth2/authorization/zitadel` 접속

2. **JWT 토큰 추출**
   - 브라우저 개발자 도구 → Application/Storage 탭
   - 또는 Network 탭에서 API 요청의 Authorization 헤더 확인

### 2-2. JWT 토큰 디코딩

1. **https://jwt.io/** 접속
2. **Encoded** 필드에 토큰 붙여넣기
3. **Decoded** 섹션에서 확인:
   - `sub`: 사용자 ID (subject)
   - `email`: 이메일
   - **Role 클레임 위치 확인**:
     - `roles`?
     - `urn:zitadel:iam:org:project:roles`?
     - 다른 경로?

### 2-3. Role 값 형식 확인

Role 클레임에서 실제 값 형식 확인:
- `["admin", "userA"]`?
- `["ADMIN", "USER_A"]`?
- 다른 형식?

### 2-4. 코드 조정

확인한 정보를 바탕으로:
- `SecurityConfig.extractRoles()` 수정
- `JwtUtils.extractRoles()` 수정

## Step 3: Zitadel Management API 스펙 확인

### 3-1. getUserSubjectByEmail() 테스트

1. **Swagger UI에서 테스트**
   - `POST /roles` API 호출
   - Email 입력하여 role 부여 시도
   - 로그에서 실제 API 호출 확인

2. **실제 API 호출 확인**
   - 로그에서 호출된 엔드포인트 확인
   - 응답 구조 확인
   - 실패 시 에러 응답 확인

3. **Zitadel API 문서와 비교**
   - 실제 엔드포인트 경로 확인
   - 요청/응답 구조 확인

### 3-2. assignRole() 테스트

1. **Swagger UI에서 테스트**
   - `POST /roles` API 호출
   - 로그에서 실제 API 호출 확인

2. **실제 API 호출 확인**
   - 요청 본문 구조 확인
   - 응답 구조 확인

### 3-3. removeRole() 테스트

1. **Swagger UI에서 테스트**
   - `DELETE /roles?email=...&role=...` API 호출
   - 로그에서 실제 API 호출 확인

### 3-4. getUserRoles() 테스트

1. **Swagger UI에서 테스트**
   - `GET /roles?email=...` API 호출
   - 응답 구조 확인

## Step 4: 통합 테스트

각 API를 순차적으로 테스트:
1. Role 부여 → 성공 확인
2. Role 조회 → 부여된 role 확인
3. Role 제거 → 성공 확인
4. Role 조회 → 제거된 role 확인
5. 권한 체크 → ADMIN 권한으로 접근 확인

## Step 5: 에러 처리 및 로깅 개선

실제 테스트 중 발견된 문제점을 개선:
- 에러 메시지 개선
- 로깅 레벨 조정
- 민감 정보 마스킹

