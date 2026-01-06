# Java 예외 전파 메커니즘 설명

## 핵심 원리

**Java에서는 예외를 catch하지 않으면 자동으로 상위로 전파됩니다.**

## 예시 코드 분석

### 시나리오 1: `getUserRoles` 메서드

```java
@Override
public List<IamRole> getUserRoles(String userId) throws IamException {
    log.info("Zitadel에서 사용자 role 조회: userId={}", userId);

    // 1. listAuthorizations 호출
    ZitadelAuthorizationDto.ListResponse response = authExecutor.listAuthorizations(userId);
    
    // 2. 응답 처리
    // ...
    
    return roles;
}
```

**예외 전파 흐름:**
```
authExecutor.listAuthorizations(userId)
  ↓ IamException 발생 (예: 네트워크 오류)
  → catch하지 않음
  → 자동으로 상위로 전파
  → getUserRoles 메서드 종료
  → 호출한 쪽(RoleService)으로 전파
```

**결론**: try-catch가 없어도 예외는 자동으로 전파됩니다!

### 시나리오 2: `findAuthorizationId` 메서드

```java
private String findAuthorizationId(String userId) throws IamException {
    // 1. listAuthorizations 호출
    ZitadelAuthorizationDto.ListResponse response = authExecutor.listAuthorizations(userId);
    
    // 2. 응답 검증
    if (response != null && response.authorizations() != null && !response.authorizations().isEmpty()) {
        // ...
        return grantId;
    }

    // 3. 추가 검증 실패 시 예외 발생
    throw new IamException("Grant ID를 찾을 수 없습니다: userId=" + userId);
}
```

**예외 전파 흐름 (2가지 경우):**

**케이스 A: listAuthorizations에서 예외 발생**
```
authExecutor.listAuthorizations(userId)
  ↓ IamException 발생
  → catch하지 않음
  → 자동으로 상위로 전파
  → findAuthorizationId 메서드 종료
  → 호출한 쪽(assignRoles/removeRole)으로 전파
```

**케이스 B: listAuthorizations는 성공했지만 grantId가 없음**
```
authExecutor.listAuthorizations(userId)
  ↓ 성공 (response 반환)
  → grantId 검증 실패
  → throw new IamException(...) 실행
  → findAuthorizationId 메서드 종료
  → 호출한 쪽(assignRoles/removeRole)으로 전파
```

## 차이점 정리

### `getUserRoles` 메서드
- **예외 처리**: 없음 (자동 전파)
- **추가 검증**: 없음
- **반환값**: 빈 리스트 (grant가 없어도 정상)

### `findAuthorizationId` 메서드
- **예외 처리**: 없음 (자동 전파)
- **추가 검증**: 있음 (grantId가 없으면 예외 발생)
- **반환값**: 항상 grantId (없으면 예외)

## Java 예외 전파 규칙

### 1. Checked Exception (컴파일 타임 체크)
```java
public void method() throws IOException {
    // IOException을 던질 수 있음
    // 호출하는 쪽에서 반드시 처리해야 함 (catch 또는 throws)
}
```

### 2. Unchecked Exception (런타임 예외)
```java
public void method() {
    // RuntimeException을 던질 수 있음
    // 호출하는 쪽에서 처리하지 않아도 됨
    throw new RuntimeException("에러");
}
```

### 3. 예외 전파 메커니즘
```java
// 메서드 A
public void methodA() throws IamException {
    methodB();  // 예외를 catch하지 않음
}

// 메서드 B
public void methodB() throws IamException {
    methodC();  // 예외를 catch하지 않음
}

// 메서드 C
public void methodC() throws IamException {
    throw new IamException("에러 발생");
}

// 실행 흐름:
// methodC() → methodB() → methodA() → 호출한 쪽
// 예외가 자동으로 전파됨!
```

## 실제 코드에서의 예외 전파

### 전체 예외 전파 경로

```
ZitadelAuthExecutor.listAuthorizations()
  ↓ IamException 발생
  → catch하지 않음
  ↓
ZitadelClient.getUserRoles()
  → catch하지 않음
  ↓
RoleService.getUserRoles()
  → catch하지 않음
  ↓
RoleController.getUserRoles()
  → catch하지 않음
  ↓
GlobalExceptionHandler.handleIamException()
  → catch하여 처리
  → HTTP 응답 반환
```

## 결론

### 질문에 대한 답변

1. **`getUserRoles`에서 `listAuthorizations`가 예외를 던지면 어떻게 되나요?**
   - ✅ 자동으로 상위로 전파됩니다.
   - try-catch가 없어도 예외는 전파됩니다.

2. **throw하는 코드가 없는데 위로 예외를 패싱할 수 있나요?**
   - ✅ 네, 가능합니다!
   - Java에서는 예외를 catch하지 않으면 자동으로 상위로 전파됩니다.
   - `throws IamException` 선언만 있으면 됩니다.

### 핵심 포인트

- **예외를 catch하지 않으면 자동 전파**
- **`throws` 선언만으로 충분**
- **try-catch는 선택사항** (예외를 처리하고 싶을 때만 사용)

