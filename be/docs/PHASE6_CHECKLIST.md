# Phase 6 체크리스트

## Step 1: 환경 준비 및 기본 테스트

### 환경 변수 확인
- [ ] `ZITADEL_DOMAIN` 설정 확인
- [ ] `ZITADEL_ORG_ID` 설정 확인
- [ ] `ZITADEL_PROJECT_ID` 설정 확인
- [ ] `ZITADEL_SERVICE_TOKEN` (API Token) 설정 확인
- [ ] `ZITADEL_ISSUER_URI` 설정 확인
- [ ] `ZITADEL_CLIENT_ID` 설정 확인
- [ ] `ZITADEL_CLIENT_SECRET` 설정 확인

### 기본 연결 테스트
- [ ] 애플리케이션 실행
- [ ] Swagger UI 접속 확인 (`http://localhost:8080/swagger-ui.html`)
- [ ] 로그에서 Zitadel 연결 오류 확인

## Step 2: JWT Role 클레임 경로 확인

### 실제 JWT 토큰 확인
- [ ] Zitadel에서 로그인하여 JWT 토큰 발급
- [ ] https://jwt.io/에서 토큰 디코딩
- [ ] Role 클레임 위치 확인
  - [ ] `roles` 클레임 존재 여부
  - [ ] `urn:zitadel:iam:org:project:roles` 클레임 존재 여부
  - [ ] 다른 경로의 role 클레임 확인
- [ ] Role 값 형식 확인 (예: "admin", "userA" 등)

### 코드 조정
- [ ] `SecurityConfig.extractRoles()` 수정
- [ ] `JwtUtils.extractRoles()` 수정
- [ ] 테스트하여 role 추출 확인

## Step 3: Zitadel Management API 스펙 확인

### getUserSubjectByEmail()
- [ ] 실제 엔드포인트 경로 확인
- [ ] 응답 구조 확인
- [ ] `ZitadelUserResponse` DTO 조정
- [ ] 테스트하여 동작 확인

### assignRole()
- [ ] 실제 엔드포인트 경로 확인
- [ ] 요청 본문 구조 확인
- [ ] 응답 구조 확인
- [ ] 코드 조정
- [ ] 테스트하여 동작 확인

### removeRole()
- [ ] 실제 엔드포인트 경로 확인
- [ ] Query parameter 확인
- [ ] 코드 조정
- [ ] 테스트하여 동작 확인

### getUserRoles()
- [ ] 실제 엔드포인트 경로 확인
- [ ] 응답 구조 확인
- [ ] `ZitadelRoleResponse` DTO 조정
- [ ] 테스트하여 동작 확인

## Step 4: 통합 테스트

- [ ] Role 부여 API 테스트
- [ ] Role 제거 API 테스트
- [ ] Role 조회 API 테스트
- [ ] 권한 체크 테스트 (ADMIN, USER_A 등)
- [ ] 에러 케이스 테스트

## Step 5: 에러 처리 및 로깅 개선

- [ ] 에러 응답 파싱 개선
- [ ] 사용자 친화적 에러 메시지
- [ ] 로깅 레벨 조정
- [ ] 민감 정보 마스킹

