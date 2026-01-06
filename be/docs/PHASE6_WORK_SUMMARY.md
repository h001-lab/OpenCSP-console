# Phase 6 작업 요약 및 정리

## 작업 개요

Phase 6은 실제 환경에서 Zitadel 통합을 검증하고 개선하는 단계입니다. 주요 목표는 JWT role 클레임 추출 및 Zitadel Management API를 통한 role 관리 기능 구현이었습니다.

## 완료된 작업

### 1. JWT Role 클레임 추출 개선 ✅

**문제:**
- Zitadel에서 JWT에 role을 포함하도록 설정했으나, role이 객체 형태로 저장됨
- 예: `"urn:zitadel:iam:org:project:roles": {"user": {"351864415584321539": "idp.avgmax.team"}}`
- 기존 코드는 단순 문자열 배열을 기대하여 role 추출 실패

**해결:**
- `SecurityConfig.extractRoles()` 수정: 객체 형태의 role 클레임 파싱 로직 추가
- `JwtUtils.extractRoles()` 수정: 동일한 파싱 로직 적용
- `IamRole` enum에 `USER("user")` 추가: Zitadel에서 사용하는 "user" role 지원

**수정 파일:**
- `be/src/main/java/io/hlab/OpenConsole/infrastructure/security/SecurityConfig.java`
- `be/src/main/java/io/hlab/OpenConsole/infrastructure/security/JwtUtils.java`
- `be/src/main/java/io/hlab/OpenConsole/infrastructure/iam/IamRole.java`

**결과:**
- `/roles/me` API에서 role 정상 반환 확인 ✅

### 2. Email Claim 설정 확인 ✅

**초기 문제:**
- JWT에 email 클레임이 없어 `JwtUtils.extractEmail()`에서 fallback으로 Zitadel Management API 호출 시도
- 불필요한 API 호출 발생

**해결:**
- 사용자가 Zitadel 콘솔에서 email 클레임 포함하도록 설정
- 코드에서 JWT의 email 클레임 직접 사용하도록 수정

**결과:**
- JWT에서 email 직접 추출 가능 ✅

### 3. Role Management API 구현 ✅

**구현 내용:**
- `POST /roles`: Role 부여 (ADMIN 권한 필요)
- `DELETE /roles`: Role 제거 (ADMIN 권한 필요)
- `GET /roles/{email}`: 특정 사용자의 role 조회 (ADMIN 권한 필요)
- `GET /roles/me`: 현재 사용자의 role 조회 (인증된 사용자)

**구현 파일:**
- `be/src/main/java/io/hlab/OpenConsole/api/role/RoleController.java`
- `be/src/main/java/io/hlab/OpenConsole/application/role/RoleService.java`
- `be/src/main/java/io/hlab/OpenConsole/infrastructure/iam/zitadel/ZitadelClient.java`

**특징:**
- Email 기반 role 관리: API는 email을 받아 내부적으로 subject로 변환
- IAM을 SSOT로 유지: subject는 DB에 저장하지 않고 IAM에서만 관리

## 진행 중인 작업

### 1. getUserSubjectByEmail() 구현 🔄

**현재 상태:**
- 구현 완료되었으나 실제 API 호출 시 404 에러 발생
- 여러 엔드포인트 시도했으나 모두 실패

**시도한 방법:**
1. `GET /management/v1/users/_by_email?email={email}` - 404
2. `GET /management/v1/users/_search?query=email:{email}` - 404
3. `GET /management/v1/users` (목록 조회) - 404
4. orgId 헤더 추가 (`x-zitadel-orgid`) - 여전히 404
5. orgId/projectId 쿼리 파라미터 추가 - 여전히 404

**문제점:**
- Zitadel Management API의 실제 스펙과 일치하지 않음
- 공식 문서 확인 필요

**상세 내용:**
- `be/docs/PHASE6_EMAIL_TO_SUBJECT_TROUBLESHOOTING.md` 참고

## 사용자 개입 포인트

### 1. IamRole을 Enum으로 변경 요청
**요청:**
> "role도 enum으로 관리하는게 좋지 않을까?"

**변경 내용:**
- `IamRole` 클래스를 enum으로 변경
- `ADMIN`, `USER_A`, `USER_B`, `USER_C`, `USER` 값 추가
- `getValue()`, `fromString()`, `of()` 메서드 구현

**파일:**
- `be/src/main/java/io/hlab/OpenConsole/infrastructure/iam/IamRole.java`

### 2. Email 기반 Role 관리로 변경
**요청:**
> "role 부여,삭제 하는 api는 subject를 인자로 줘야하던데, db엔 subject를 따로 저장하지 않고 있어. 이 경우 email로 subject를 가져오는 api를 iam에 보내던가 하는 과정이 필요할 것 같은데 어떻게 생각해?"

**변경 내용:**
- Role 관리 API가 email을 받도록 변경
- `RoleService`에서 `iamClient.getUserSubjectByEmail()` 호출하여 내부적으로 subject 변환
- `ZitadelClient.getUserSubjectByEmail()` 메서드 추가

**파일:**
- `be/src/main/java/io/hlab/OpenConsole/api/role/RoleController.java`
- `be/src/main/java/io/hlab/OpenConsole/application/role/RoleService.java`
- `be/src/main/java/io/hlab/OpenConsole/infrastructure/iam/IamClient.java`
- `be/src/main/java/io/hlab/OpenConsole/infrastructure/iam/zitadel/ZitadelClient.java`

### 3. Zitadel Management API 문서 확인 요청
**요청:**
> "zitadel management api 문서를 한번 보지 그래?"

**상황:**
- 여러 시도 후에도 404 에러가 계속 발생
- 사용자가 공식 문서 확인을 요청

**현재 상태:**
- 문서 확인 필요
- 실제 API 스펙에 맞게 수정 대기 중

### 4. orgId 헤더 추가 제안
**요청:**
> "project id는 없어도 되는거야?"

**변경 내용:**
- projectId를 쿼리 파라미터에 추가 시도
- orgId 헤더도 함께 사용 시도

**결과:**
- 여전히 404 에러 발생

### 5. 중복 작업 지적
**요청:**
> "아니 orgid 헤더 넣는건 아까도 해보지 않았어?"

**상황:**
- orgId 헤더 추가를 이미 시도했었으나 다시 시도함
- 사용자가 중복 작업 지적

**결과:**
- 작업 중단 및 정리 요청

## 코드 정리

### 제거된 불필요한 주석
- `ZitadelClient.java`에서 과도한 주석 정리
- TODO 주석은 유지 (실제 작업 필요)

### 정리된 파일
- `be/src/main/java/io/hlab/OpenConsole/infrastructure/iam/zitadel/ZitadelClient.java`
  - 불필요한 주석 제거
  - 코드 가독성 개선

## 남은 작업

### 즉시 해결 필요
1. **getUserSubjectByEmail() 구현 완료**
   - Zitadel Management API 문서 확인
   - 실제 엔드포인트 및 파라미터 형식 확인
   - 코드 수정 및 테스트

### 향후 개선 사항
1. **에러 처리 개선**
   - 더 명확한 에러 메시지
   - 재시도 로직 (필요시)

2. **로깅 개선**
   - 상세한 디버그 로깅
   - 요청/응답 전체 로깅

3. **테스트 코드 작성**
   - 단위 테스트
   - 통합 테스트

4. **문서화**
   - API 사용 가이드
   - Troubleshooting 가이드

## 참고 문서

- `be/docs/PHASE6_EMAIL_TO_SUBJECT_TROUBLESHOOTING.md` - Email to Subject 조회 문제 상세
- `be/docs/PHASE6_CURRENT_STATUS.md` - 현재 진행 상황
- `be/docs/PROJECT_STATUS.md` - 전체 프로젝트 상태
- `be/docs/TESTING_GUIDE.md` - 테스트 가이드
- `be/docs/ZITADEL_JWT_TOKEN_GUIDE.md` - JWT 토큰 가이드

## 결론

Phase 6에서 JWT role 클레임 추출 및 Role Management API 구현은 완료되었으나, `getUserSubjectByEmail()` 메서드가 Zitadel Management API의 실제 스펙과 일치하지 않아 404 에러가 발생하고 있습니다. Zitadel 공식 문서를 확인하여 정확한 엔드포인트와 파라미터 형식을 확인한 후 수정이 필요합니다.

