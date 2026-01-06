# 책임 분리 관점에서의 예외 처리 전략

## 질문

`findAuthorizationId`가 grantId를 반환하지 못하면 "다음 로직"에서 실행이 불가하다는 것은, 
`findAuthorizationId`에서 예외를 던질게 아니라, 
`findAuthorizationId`를 호출한 함수에서 grantId가 null이면 throw를 하는 식으로 하는게 맞지 않아?

## 두 가지 접근 방식 비교

### 방식 1: 현재 방식 - `findAuthorizationId`에서 예외 던지기

```java
private String findAuthorizationId(String userId) throws IamException {
    ZitadelAuthorizationDto.ListResponse response = authExecutor.listAuthorizations(userId);
    
    if (response != null && response.authorizations() != null && !response.authorizations().isEmpty()) {
        String grantId = response.authorizations().get(0).id();
        if (grantId != null && !grantId.isBlank()) {
            return grantId;
        }
    }

    // 여기서 예외 던지기
    throw new IamException("Grant ID를 찾을 수 없습니다: userId=" + userId);
}

// 호출하는 쪽
public void removeRole(String userId, IamRole role) throws IamException {
    String grantId = findAuthorizationId(userId);  // 예외 발생 시 자동 전파
    authExecutor.updateAuthorization(grantId, updatedRoleKeys);
}
```

**특징:**
- `findAuthorizationId`: 조회 + 검증 담당
- 호출하는 쪽: null 체크 불필요

### 방식 2: 제안 방식 - `findAuthorizationId`는 null 반환, 호출하는 쪽에서 예외

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

// 호출하는 쪽
public void removeRole(String userId, IamRole role) throws IamException {
    String grantId = findAuthorizationId(userId);
    
    // 호출하는 쪽에서 null 체크 및 예외
    if (grantId == null) {
        throw new IamException("Grant ID를 찾을 수 없습니다: userId=" + userId);
    }
    
    authExecutor.updateAuthorization(grantId, updatedRoleKeys);
}
```

**특징:**
- `findAuthorizationId`: 조회만 담당
- 호출하는 쪽: 검증 담당

## 책임 분리 원칙 관점

### Single Responsibility Principle (단일 책임 원칙)

**방식 1 (현재):**
- `findAuthorizationId`: 조회 + 검증
- 책임: 2개 (조회, 검증)

**방식 2 (제안):**
- `findAuthorizationId`: 조회만
- 호출하는 쪽: 검증
- 책임: 각각 1개

**결론**: 방식 2가 더 단일 책임 원칙에 부합 ✅

## 실제 코드 비교

### 현재 방식 (방식 1)

```java
// findAuthorizationId: 조회 + 검증
private String findAuthorizationId(String userId) throws IamException {
    // ... 조회 로직 ...
    throw new IamException("Grant ID를 찾을 수 없습니다: userId=" + userId);
}

// removeRole: 단순 호출
public void removeRole(String userId, IamRole role) throws IamException {
    String grantId = findAuthorizationId(userId);  // 예외 자동 전파
    authExecutor.updateAuthorization(grantId, updatedRoleKeys);
}

// assignRoles: 단순 호출
public void assignRoles(String userId, List<IamRole> roles) throws IamException {
    // ...
    String grantId = findAuthorizationId(userId);  // 예외 자동 전파
    // ...
}
```

**장점:**
- ✅ 호출하는 쪽 코드가 간단함
- ✅ 중복 검증 코드 없음
- ✅ 일관된 에러 메시지

**단점:**
- ⚠️ `findAuthorizationId`가 조회와 검증을 모두 담당 (책임이 2개)

### 제안 방식 (방식 2)

```java
// findAuthorizationId: 조회만
private String findAuthorizationId(String userId) throws IamException {
    // ... 조회 로직 ...
    return null;  // null 반환
}

// removeRole: 호출 + 검증
public void removeRole(String userId, IamRole role) throws IamException {
    String grantId = findAuthorizationId(userId);
    
    if (grantId == null) {
        throw new IamException("Grant ID를 찾을 수 없습니다: userId=" + userId);
    }
    
    authExecutor.updateAuthorization(grantId, updatedRoleKeys);
}

// assignRoles: 호출 + 검증
public void assignRoles(String userId, List<IamRole> roles) throws IamException {
    // ...
    String grantId = findAuthorizationId(userId);
    
    if (grantId == null) {
        throw new IamException("Grant ID를 찾을 수 없습니다: userId=" + userId);
    }
    
    // ...
}
```

**장점:**
- ✅ 단일 책임 원칙 준수
- ✅ `findAuthorizationId`는 조회만 담당
- ✅ 호출하는 쪽에서 검증 로직 제어 가능

**단점:**
- ⚠️ 호출하는 모든 곳에서 null 체크 필요 (중복 코드)
- ⚠️ 에러 메시지가 여러 곳에 분산될 수 있음

## 실제 사용 맥락 분석

### `findAuthorizationId` 호출 위치

1. **`removeRole` (111줄)**: grantId 없으면 role 제거 불가
2. **`assignRoles`의 409 처리 (77줄)**: grantId 없으면 update 불가

**공통점:**
- 둘 다 grantId가 없으면 다음 로직을 수행할 수 없음
- 둘 다 같은 에러 메시지 필요

## 하이브리드 접근: Optional 사용

두 방식의 장점을 결합할 수 있습니다:

```java
// findAuthorizationId: 조회만, Optional 반환
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

// removeRole: 호출 + 검증 (명확한 에러 메시지)
public void removeRole(String userId, IamRole role) throws IamException {
    String grantId = findAuthorizationId(userId)
        .orElseThrow(() -> new IamException("Grant ID를 찾을 수 없습니다: userId=" + userId));
    
    authExecutor.updateAuthorization(grantId, updatedRoleKeys);
}

// assignRoles: 호출 + 검증 (명확한 에러 메시지)
public void assignRoles(String userId, List<IamRole> roles) throws IamException {
    // ...
    String grantId = findAuthorizationId(userId)
        .orElseThrow(() -> new IamException("Grant ID를 찾을 수 없습니다: userId=" + userId));
    // ...
}
```

**장점:**
- ✅ 단일 책임 원칙 준수 (`findAuthorizationId`는 조회만)
- ✅ 명확한 에러 메시지 (호출하는 쪽에서 제어)
- ✅ null 안전성 (Optional 사용)

**단점:**
- ⚠️ 호출하는 모든 곳에서 `orElseThrow` 필요 (하지만 명확함)

## 결론 및 권장사항

### 제안 방식 (방식 2)이 더 나은 이유

1. **단일 책임 원칙**: `findAuthorizationId`는 조회만 담당
2. **유연성**: 호출하는 쪽에서 검증 로직 제어 가능
3. **명확성**: 각 메서드의 책임이 명확함

### 최종 권장: Optional 사용 (하이브리드)

**이유:**
1. ✅ 단일 책임 원칙 준수
2. ✅ null 안전성
3. ✅ 명확한 에러 메시지 제어
4. ✅ 호출하는 쪽에서 검증 로직 명시적

### 구현 예시

```java
// findAuthorizationId: 조회만 담당
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

// removeRole: 검증 담당
public void removeRole(String userId, IamRole role) throws IamException {
    String grantId = findAuthorizationId(userId)
        .orElseThrow(() -> new IamException("Grant ID를 찾을 수 없습니다: userId=" + userId));
    
    authExecutor.updateAuthorization(grantId, updatedRoleKeys);
}
```

## 최종 답변

**제안하신 방식이 더 나은 설계입니다!** ✅

**이유:**
1. 단일 책임 원칙 준수
2. 책임 분리 명확
3. 유연성 향상

**구현 방법:**
- `findAuthorizationId`: Optional 반환 (조회만)
- 호출하는 쪽: `orElseThrow`로 검증 및 예외 처리

