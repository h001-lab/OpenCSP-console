# Phase 6 다음 단계 가이드

## ✅ 완료된 항목

1. **JWT Email 클레임 포함** ✅
   - Zitadel 설정에서 email 클레임이 JWT에 포함되도록 설정 완료
   - JWT에서 email 추출 정상 동작 확인

## 🔍 다음 확인 사항

### 1. JWT Role 클레임 경로 확인 (우선순위: 높음)

**목적**: Zitadel에서 role을 부여했을 때 JWT에 어떤 경로로 포함되는지 확인

**확인 방법**:
1. **Zitadel에서 role 부여**
   - Zitadel Console에서 사용자에게 role 부여 (예: `admin`, `userA`)
   - 또는 백엔드 API `POST /roles` 사용

2. **새 JWT 토큰 발급**
   - 로그아웃 후 다시 로그인하여 새 토큰 발급
   - 또는 토큰 갱신

3. **JWT 토큰 디코딩**
   - https://jwt.io/에서 토큰 디코딩
   - Role 클레임 위치 확인:
     - `roles`?
     - `urn:zitadel:iam:org:project:roles`?
     - `org.roles`?
     - 다른 경로?

4. **Role 값 형식 확인**
   - 배열 형식? `["admin", "userA"]`
   - 객체 형식? `{"admin": true, "userA": true}`
   - 문자열? `"admin"`

5. **코드 조정**
   - 확인한 경로에 맞게 `SecurityConfig.extractRoles()` 수정
   - `JwtUtils.extractRoles()` 수정
   - `ZitadelTokenDecoder.extractRoles()` 수정

**예상 결과**:
- 로그에서 `Extracted roles from JWT: [ADMIN, USER_A]` 형태로 출력
- `/roles/me` API에서 role 목록 반환

---

### 2. Zitadel Management API 스펙 확인 (우선순위: 중간)

**목적**: 실제 Zitadel API 엔드포인트와 요청/응답 구조 확인

#### 2-1. getUserSubjectByEmail() 확인

**확인 사항**:
- 실제 엔드포인트: `/management/v1/users/_by_email?email={email}` 맞는지?
- 응답 구조: `ZitadelUserResponse` DTO가 실제 응답과 일치하는지?

**테스트 방법**:
1. Swagger에서 `POST /roles` API 호출 (email로 role 부여)
2. 로그에서 실제 호출된 API 확인
3. 성공/실패 응답 확인

#### 2-2. assignRole() 확인

**확인 사항**:
- 실제 엔드포인트: `/management/v1/users/{userId}/grants` 맞는지?
- 요청 본문 구조 확인
- Role ID 형식 확인 (예: `"admin"` vs `"urn:zitadel:iam:org:project:role:admin"`)

**테스트 방법**:
1. Swagger에서 `POST /roles` API 호출
2. 로그에서 실제 API 호출 확인
3. 성공 시 JWT에 role 포함되는지 확인

#### 2-3. removeRole() 확인

**확인 사항**:
- 실제 엔드포인트: `/management/v1/users/{userId}/grants/{grantId}` 맞는지?
- Grant ID 형식 확인

**테스트 방법**:
1. Swagger에서 `DELETE /roles?email=...&role=...` API 호출
2. 로그에서 실제 API 호출 확인

#### 2-4. getUserRoles() 확인

**확인 사항**:
- 실제 엔드포인트: `/management/v1/users/{userId}/grants` 맞는지?
- 응답 구조: `ZitadelRoleResponse` DTO가 실제 응답과 일치하는지?

**테스트 방법**:
1. Swagger에서 `GET /roles/{email}` API 호출
2. 응답 구조 확인

---

### 3. 통합 테스트 (우선순위: 중간)

**테스트 시나리오**:

1. **Role 부여 → 조회**
   ```
   POST /roles {email: "user@example.com", role: "USER_A"}
   → 성공 확인
   GET /roles/user@example.com
   → ["USER_A"] 반환 확인
   ```

2. **Role 제거 → 조회**
   ```
   DELETE /roles?email=user@example.com&role=USER_A
   → 성공 확인
   GET /roles/user@example.com
   → [] 반환 확인
   ```

3. **권한 체크**
   ```
   ADMIN role로 로그인
   → ADMIN 전용 API 접근 가능 확인
   USER_A role로 로그인
   → USER_A 전용 API 접근 가능 확인
   ```

4. **에러 케이스**
   - 존재하지 않는 사용자
   - 권한 없는 사용자가 role 부여 시도
   - 이미 부여된 role 다시 부여

---

### 4. 에러 처리 및 로깅 개선 (우선순위: 낮음)

**개선 사항**:
- 에러 응답 파싱 개선
- 사용자 친화적 에러 메시지
- 로깅 레벨 조정 (DEBUG → INFO)
- 민감 정보 마스킹 (API Token 등)

---

## 🎯 권장 진행 순서

1. **Step 1: JWT Role 클레임 경로 확인** (가장 중요)
   - Zitadel에서 role 부여
   - JWT 토큰 확인
   - 코드 조정

2. **Step 2: Role 부여/조회 API 테스트**
   - `POST /roles` 테스트
   - `GET /roles/{email}` 테스트
   - 실제 Zitadel API 호출 확인

3. **Step 3: 나머지 API 테스트**
   - `DELETE /roles` 테스트
   - 권한 체크 테스트

4. **Step 4: 에러 처리 개선**
   - 실제 테스트 중 발견된 문제 개선

---

## 📝 체크리스트

### JWT Role 클레임 확인
- [ ] Zitadel에서 role 부여
- [ ] 새 JWT 토큰 발급
- [ ] jwt.io에서 토큰 디코딩
- [ ] Role 클레임 경로 확인
- [ ] Role 값 형식 확인
- [ ] 코드 조정
- [ ] `/roles/me` API에서 role 반환 확인

### Management API 확인
- [ ] `getUserSubjectByEmail()` 엔드포인트 확인
- [ ] `assignRole()` 엔드포인트 확인
- [ ] `removeRole()` 엔드포인트 확인
- [ ] `getUserRoles()` 엔드포인트 확인
- [ ] 각 API 응답 구조 확인 및 DTO 조정

### 통합 테스트
- [ ] Role 부여 API 테스트
- [ ] Role 조회 API 테스트
- [ ] Role 제거 API 테스트
- [ ] 권한 체크 테스트
- [ ] 에러 케이스 테스트

