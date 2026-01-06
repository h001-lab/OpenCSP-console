# 프로젝트 진행 상황

## 완료된 작업 (Phase 1-5)

### Phase 1: 기본 구조 설정 ✅
- [x] IAM 인터페이스 설계 (`IamClient`, `IamTokenDecoder`)
- [x] IAM Role Enum 생성 (`IamRole`: ADMIN, USER_A, USER_B, USER_C)
- [x] Spring Security 기본 설정
- [x] OAuth2 Client 및 Resource Server 설정

### Phase 2: Zitadel 구현 ✅
- [x] `ZitadelClient` 구현 (IAM 인터페이스 구현체)
  - `assignRole()`: Role 부여
  - `removeRole()`: Role 제거
  - `getUserRoles()`: Role 조회
  - `getUserSubjectByEmail()`: Email로 subject 조회
- [x] `ZitadelTokenDecoder` 구현
- [x] Zitadel DTO 생성 (`ZitadelRoleResponse`, `ZitadelUserResponse`)

### Phase 3: JWT 검증 및 Role 추출 ✅
- [x] `SecurityConfig`에 JWT role 추출 로직 추가
- [x] `JwtUtils` 유틸리티 클래스 생성
  - JWT에서 role 추출
  - 현재 사용자 정보 추출
- [x] `JwtAuthenticationConverter` 구현 (SecurityConfig 내부)
- [x] `@PreAuthorize` 사용 가능하도록 설정

### Phase 4: 권한 체크 및 테스트 환경 ✅
- [x] `GlobalExceptionHandler`에 권한 예외 처리 추가
- [x] `UserControllerExample` 생성 (권한 체크 예시)
- [x] Swagger UI 설정 (`OpenApiConfig`)
- [x] Swagger UI에서 JWT 토큰 입력 가능하도록 설정
- [x] SecurityConfig에 Swagger 경로 허용
- [x] 테스트 가이드 문서 작성 (`TESTING_GUIDE.md`)
- [x] Zitadel JWT 토큰 발급 가이드 작성 (`ZITADEL_JWT_TOKEN_GUIDE.md`)

### Phase 5: Role 관리 API 구현 ✅
- [x] `RoleService` 생성 (Application Layer)
- [x] `RoleController` 생성 (API Layer)
  - `POST /roles`: Role 부여 (ADMIN 권한 필요)
  - `DELETE /roles`: Role 제거 (ADMIN 권한 필요)
  - `GET /roles`: 사용자 role 조회 (ADMIN 권한 필요)
  - `GET /roles/me`: 현재 사용자 role 조회 (인증된 사용자 모두)
- [x] Role DTO 생성 (`RoleAssignRequest`, `RoleResponse`)
- [x] Email 기반으로 변경 (subject 대신 email 사용)
- [x] `IamClient`에 `getUserSubjectByEmail()` 메서드 추가
- [x] `ErrorCode`에 `UNAUTHORIZED`, `FORBIDDEN` 추가

### 추가 완료 작업 ✅
- [x] JIT User Provisioning 구현
  - 첫 로그인 시 DB에 사용자 생성
  - 기본 role (USER_A) 자동 부여
- [x] 패키지 구조 문서화 (`PACKAGE_STRUCTURE.md`)
- [x] 테스트 코드 작성 (`UserControllerSecurityTest`)
- [x] 빌드 및 테스트 통과 확인

## 현재 상태

### 구현 완료된 기능
1. **인증/인가**
   - OAuth2 로그인 플로우 (Zitadel)
   - JWT 토큰 검증
   - Role 기반 권한 체크 (`@PreAuthorize`)
   - JIT User Provisioning

2. **Role 관리**
   - Role 부여/제거/조회 API
   - Email 기반 role 관리
   - 현재 사용자 role 조회

3. **사용자 관리**
   - 사용자 생성/조회/수정/삭제
   - Email 기반 사용자 식별

4. **문서화**
   - Swagger UI 설정
   - 테스트 가이드
   - Zitadel JWT 토큰 발급 가이드
   - 패키지 구조 문서

### 알려진 제한사항 / TODO

1. **Zitadel Management API 스펙 확인 필요**
   - `ZitadelClient.assignRole()`: 실제 API 스펙에 맞게 요청 본문 구성 필요
   - `ZitadelClient.getUserSubjectByEmail()`: 실제 엔드포인트 경로 확인 필요
   - 현재는 예상 구조로 구현되어 있음

2. **JWT Role 클레임 경로**
   - `SecurityConfig.extractRoles()`: 실제 Zitadel의 role 클레임 경로 확인 필요
   - 현재는 `roles` 및 `*roles*` 패턴으로 검색

3. **기본 Role 설정**
   - `JITUserProvisioningHandler`: 기본 role을 설정 파일로 관리 가능하도록 개선 필요

## 앞으로 진행할 작업

### Phase 6: 실제 환경 검증 및 개선 (부분 완료)
- [x] 실제 Zitadel 환경에서 테스트
- [x] JWT role 클레임 경로 실제 환경에서 확인 및 조정 ✅
- [x] Email claim 설정 확인 ✅
- [x] Role Management API 구현 ✅
- [ ] Zitadel Management API 실제 스펙 확인 및 조정 (진행 중)
  - [x] `assignRole()` API 구현 (스펙 확인 필요)
  - [x] `removeRole()` API 구현 (스펙 확인 필요)
  - [x] `getUserRoles()` API 구현 (스펙 확인 필요)
  - [ ] `getUserSubjectByEmail()` API 스펙 확인 및 수정 (404 에러 발생 중)
- [ ] 에러 처리 개선
- [ ] 로깅 개선

**상세 내용**: `be/docs/PHASE6_WORK_SUMMARY.md` 참고

### Phase 7: 추가 기능 (우선순위: 중간)
- [ ] 기본 role 설정을 `application.yaml`로 관리
- [ ] Role 변경 이력 추적 (선택사항)
- [ ] 사용자 프로필 관리 API 확장
- [ ] 사용자 목록 조회 API (페이징, 필터링)

### Phase 8: 성능 및 최적화 (우선순위: 낮음)
- [ ] IAM API 호출 캐싱 (subject 조회 등)
- [ ] Role 조회 최적화
- [ ] 비동기 처리 (필요시)

### Phase 9: 모니터링 및 운영 (우선순위: 낮음)
- [ ] 메트릭 수집 (IAM API 호출 횟수, 실패율 등)
- [ ] 알림 설정 (IAM API 실패 시)
- [ ] 헬스 체크 엔드포인트

## 기술 스택

### 백엔드
- **Framework**: Spring Boot 3.5.8
- **Language**: Java 21
- **Build Tool**: Gradle
- **Security**: Spring Security, OAuth2 Client, OAuth2 Resource Server
- **IAM**: Zitadel (추상화되어 있어 다른 IAM으로 교체 가능)
- **Database**: JPA/Hibernate (MariaDB, PostgreSQL 지원)
- **API Documentation**: SpringDoc OpenAPI (Swagger UI)

### 주요 의존성
- `spring-boot-starter-web`
- `spring-boot-starter-webflux`
- `spring-boot-starter-data-jpa`
- `spring-boot-starter-security`
- `spring-boot-starter-oauth2-client`
- `spring-boot-starter-oauth2-resource-server`
- `springdoc-openapi-starter-webmvc-ui`

## 아키텍처

### 레이어드 아키텍처
```
API Layer (api/)
  ↓
Application Layer (application/)
  ↓
Domain Layer (domain/)
  ↓
Infrastructure Layer (infrastructure/)
```

### 주요 설계 원칙
1. **IAM SSOT (Single Source of Truth)**: 사용자 정보는 IAM에서 관리, DB에는 최소한의 정보만 저장
2. **의존성 역전**: Infrastructure가 Domain에 의존하지 않도록 인터페이스 사용
3. **추상화**: IAM 시스템을 추상화하여 다른 IAM으로 교체 가능
4. **Email 기반 식별**: DB와 API 모두 email을 사용하여 일관성 유지

## 다음 단계 권장사항

1. **즉시 진행**: Phase 6 (실제 환경 검증)
   - 실제 Zitadel 환경에서 테스트
   - API 스펙 확인 및 조정
   - JWT role 클레임 경로 확인

2. **단기**: Phase 7 (추가 기능)
   - 기본 role 설정 관리
   - 사용자 관리 API 확장

3. **중장기**: Phase 8-9 (최적화 및 운영)
   - 성능 최적화
   - 모니터링 구축

## 참고 문서

- [테스트 가이드](./TESTING_GUIDE.md)
- [Zitadel JWT 토큰 발급 가이드](./ZITADEL_JWT_TOKEN_GUIDE.md)
- [Phase 6 작업 요약](./PHASE6_WORK_SUMMARY.md)
- [Phase 6 Email to Subject Troubleshooting](./PHASE6_EMAIL_TO_SUBJECT_TROUBLESHOOTING.md)
- [컨벤션](./convention_v1.0.md)

