# Phase 6 현재 진행 상황

## ✅ 완료된 항목

### Step 1: 환경 준비 및 기본 테스트 ✅
- [x] 애플리케이션 실행
- [x] Swagger UI 접속 확인
- [x] 기본 연결 확인

### Step 2: JWT Role 클레임 경로 확인 ✅
- [x] JWT 토큰 디코딩 확인
- [x] Role 클레임 위치 확인: `urn:zitadel:iam:org:project:roles`
- [x] Role 값 형식 확인: 객체 형태 `{"user": {"351864415584321539": "idp.avgmax.team"}}`
- [x] `SecurityConfig.extractRoles()` 수정 완료
- [x] `JwtUtils.extractRoles()` 수정 완료
- [x] `USER` role 추가 완료
- [x] `/roles/me` API에서 role 반환 확인 ✅

## 🔄 다음 단계: Step 3 - Zitadel Management API 스펙 확인

### 3-1. getUserSubjectByEmail() 확인
**현재 상태**: 구현되어 있으나 실제 API 스펙 확인 필요

**확인 사항**:
- [ ] 실제 엔드포인트: `/management/v1/users/_by_email?email={email}` 맞는지?
- [ ] 응답 구조: `ZitadelUserResponse` DTO가 실제 응답과 일치하는지?
- [ ] 에러 응답 처리 확인

**테스트 방법**:
1. Swagger에서 `POST /roles` API 호출 (email로 role 부여)
2. 로그에서 실제 호출된 API 확인
3. 성공/실패 응답 확인

---

### 3-2. assignRole() 확인
**현재 상태**: 구현되어 있으나 실제 API 스펙 확인 필요

**확인 사항**:
- [ ] 실제 엔드포인트: `/management/v1/users/{userId}/roles` 맞는지?
- [ ] 요청 본문 구조 확인
- [ ] Role ID 형식 확인 (예: `"admin"` vs `"urn:zitadel:iam:org:project:role:admin"`)
- [ ] 응답 구조 확인

**테스트 방법**:
1. Swagger에서 `POST /roles` API 호출
   ```json
   {
     "email": "user@example.com",
     "role": "USER_A"
   }
   ```
2. 로그에서 실제 API 호출 확인
3. 성공 시 JWT에 role 포함되는지 확인 (새 토큰 발급 후)

---

### 3-3. removeRole() 확인
**현재 상태**: 구현되어 있으나 실제 API 스펙 확인 필요

**확인 사항**:
- [ ] 실제 엔드포인트: `/management/v1/users/{userId}/roles/{roleKey}?projectId={projectId}` 맞는지?
- [ ] Query parameter 확인
- [ ] 에러 응답 처리 확인

**테스트 방법**:
1. Swagger에서 `DELETE /roles?email=user@example.com&role=USER_A` API 호출
2. 로그에서 실제 API 호출 확인
3. 성공 확인

---

### 3-4. getUserRoles() 확인
**현재 상태**: 구현되어 있으나 실제 API 스펙 확인 필요

**확인 사항**:
- [ ] 실제 엔드포인트: `/management/v1/users/{userId}/roles?projectId={projectId}` 맞는지?
- [ ] 응답 구조: `ZitadelRoleResponse` DTO가 실제 응답과 일치하는지?
- [ ] Role 값 형식 확인

**테스트 방법**:
1. Swagger에서 `GET /roles/{email}` API 호출
2. 응답 구조 확인
3. 로그에서 실제 API 호출 확인

---

## 📋 권장 진행 순서

1. **getUserSubjectByEmail() 테스트** (가장 먼저)
   - Role 부여/제거/조회 API 모두에서 사용되므로 우선 확인 필요

2. **assignRole() 테스트**
   - Role 부여 후 새 토큰 발급하여 JWT에 포함되는지 확인

3. **getUserRoles() 테스트**
   - 부여한 role이 정상적으로 조회되는지 확인

4. **removeRole() 테스트**
   - Role 제거 후 조회하여 제거되었는지 확인

5. **통합 테스트**
   - 전체 플로우 테스트 (부여 → 조회 → 제거 → 조회)

---

## 🎯 다음 작업

**즉시 진행**: Zitadel Management API 스펙 확인 및 테스트

1. `POST /roles` API 호출하여 `getUserSubjectByEmail()` 및 `assignRole()` 테스트
2. 로그에서 실제 API 호출 확인
3. 응답 구조 확인 및 DTO 조정 (필요시)
4. 성공/실패 케이스 모두 테스트

