# 예외 검증 전략: Fail-Fast vs Lazy Validation

## 질문

`findAuthorizationId`에서 grantId가 없을 때 예외를 던지는 것이 정말 필요한가?
`updateAuthorization`에서 grantId가 null이면 어차피 예외를 던질 텐데, 왜 미리 예외를 던져야 하나?

## 두 가지 접근 방식 비교

### 방식 1: Fail-Fast (현재 방식) ✅ 권장

```java
private String findAuthorizationId(String userId) throws IamException {
    ZitadelAuthorizationDto.ListResponse response = authExecutor.listAuthorizations(userId);
    
    if (response != null && response.authorizations() != null && !response.authorizations().isEmpty()) {
        String grantId = response.authorizations().get(0).id();
        if (grantId != null && !grantId.isBlank()) {
            return grantId;
        }
    }

    // grantId가 없으면 즉시 예외 발생
    throw new IamException("Grant ID를 찾을 수 없습니다: userId=" + userId);
}
```

**장점:**
1. ✅ **명확한 에러 메시지**: "Grant ID를 찾을 수 없습니다" - 문제를 정확히 알 수 있음
2. ✅ **빠른 실패**: 불필요한 API 호출 방지 (`updateAuthorization` 호출 전에 실패)
3. ✅ **명확한 책임**: `findAuthorizationId`는 grantId를 찾는 책임, 없으면 예외
4. ✅ **디버깅 용이**: 어디서 문제가 발생했는지 명확

**단점:**
1. ⚠️ 중복 검증 가능성 (하지만 의미가 다름)

### 방식 2: Lazy Validation (null 반환)

```java
private String findAuthorizationId(String userId) throws IamException {
    ZitadelAuthorizationDto.ListResponse response = authExecutor.listAuthorizations(userId);
    
    if (response != null && response.authorizations() != null && !response.authorizations().isEmpty()) {
        String grantId = response.authorizations().get(0).id();
        if (grantId != null && !grantId.isBlank()) {
            return grantId;
        }
    }

    // null 반환
    return null;
}

// 호출하는 쪽에서 처리
public void removeRole(String userId, IamRole role) throws IamException {
    String grantId = findAuthorizationId(userId);
    
    if (grantId == null) {
        throw new IamException("Grant ID를 찾을 수 없습니다: userId=" + userId);
    }
    
    // 또는 updateAuthorization에 null 전달하고 거기서 예외 발생 대기
    authExecutor.updateAuthorization(grantId, updatedRoleKeys);
}
```

**장점:**
1. ✅ 유연성: 호출하는 쪽에서 처리 방법 선택 가능
2. ✅ 중복 검증 제거 가능

**단점:**
1. ❌ **불명확한 에러 메시지**: `updateAuthorization`에서 예외 발생 시 "invalid grantId" 같은 일반적인 메시지
2. ❌ **불필요한 API 호출**: grantId가 null인데도 `updateAuthorization` 호출
3. ❌ **책임 분산**: 검증 로직이 여러 곳에 분산
4. ❌ **null 체크 필요**: 호출하는 모든 곳에서 null 체크 필요

## 실제 시나리오 비교

### 시나리오: grantId가 없는 경우

#### 방식 1: Fail-Fast (현재)
```
removeRole 호출
  ↓
findAuthorizationId 호출
  ↓ grantId 없음
  → 즉시 예외 발생: "Grant ID를 찾을 수 없습니다: userId=123"
  → updateAuthorization 호출 안 함
  → 불필요한 API 호출 없음
```

**에러 메시지**: "Grant ID를 찾을 수 없습니다: userId=123" ✅ 명확

#### 방식 2: Lazy Validation
```
removeRole 호출
  ↓
findAuthorizationId 호출
  ↓ grantId 없음
  → null 반환
  ↓
updateAuthorization 호출 (grantId=null)
  ↓ Zitadel API 호출
  → 400 Bad Request: "invalid grantId"
  → 예외 발생: "Authorization 업데이트 실패: invalid grantId"
```

**에러 메시지**: "Authorization 업데이트 실패: invalid grantId" ❌ 덜 명확

## Zitadel API 동작 예상

`updateAuthorization`에 null이나 빈 문자열을 전달하면:
- Zitadel API가 400 Bad Request 반환 가능성 높음
- 에러 메시지: "invalid grantId" 또는 "grantId is required" 같은 일반적인 메시지
- 원인 파악이 어려움

## Fail-Fast 원칙

**Fail-Fast (빠른 실패)**: 문제를 가능한 한 빨리 발견하고 명확한 에러 메시지를 제공

### 예시
```java
// ❌ 나쁜 예: 나중에 실패
public void process(String data) {
    // ... 많은 로직 ...
    if (data == null) {
        throw new Exception("data is null");  // 너무 늦게 발견
    }
}

// ✅ 좋은 예: 즉시 실패
public void process(String data) {
    if (data == null) {
        throw new Exception("data is null");  // 즉시 발견
    }
    // ... 많은 로직 ...
}
```

## 책임 분리 원칙

각 메서드는 자신의 책임 범위에서 검증해야 합니다.

### `findAuthorizationId`의 책임
- **목적**: grantId를 찾아서 반환
- **검증**: grantId가 없으면 예외 (자신의 책임 범위에서 검증)

### `updateAuthorization`의 책임
- **목적**: grantId로 Authorization 업데이트
- **검증**: grantId 형식이 올바른지 (API 레벨 검증)

## 결론 및 권장사항

### ✅ 현재 방식 (Fail-Fast) 유지 권장

**이유:**
1. **명확한 에러 메시지**: 문제를 정확히 알 수 있음
2. **빠른 실패**: 불필요한 API 호출 방지
3. **명확한 책임**: 각 메서드가 자신의 책임 범위에서 검증
4. **디버깅 용이**: 어디서 문제가 발생했는지 명확

### 대안: Optional 사용 (선택사항)

만약 null 반환을 원한다면 Optional을 사용하는 것이 더 안전합니다:

```java
private Optional<String> findAuthorizationId(String userId) throws IamException {
    ZitadelAuthorizationDto.ListResponse response = authExecutor.listAuthorizations(userId);
    
    if (response != null && response.authorizations() != null && !response.authorizations().isEmpty()) {
        String grantId = response.authorizations().get(0).id();
        if (grantId != null && !grantId.isBlank()) {
            return Optional.of(grantId);
        }
    }

    return Optional.empty();
}

// 호출하는 쪽
public void removeRole(String userId, IamRole role) throws IamException {
    String grantId = findAuthorizationId(userId)
        .orElseThrow(() -> new IamException("Grant ID를 찾을 수 없습니다: userId=" + userId));
    
    authExecutor.updateAuthorization(grantId, updatedRoleKeys);
}
```

하지만 이 경우에도 결국 예외를 던지므로, 현재 방식과 큰 차이가 없습니다.

## 최종 권장사항

**현재 방식 유지**: `findAuthorizationId`에서 grantId가 없으면 예외를 던지는 것이 올바른 접근입니다.

**이유:**
- 명확한 에러 메시지
- 빠른 실패
- 명확한 책임 분리
- 디버깅 용이

