# 예외 처리 흐름 상세 설명

## 기본 원리

**예외는 catch되면 전파가 중단됩니다.**

```java
// 예외가 catch되면 더 이상 전파되지 않음
try {
    someMethod(); // 여기서 예외 발생
} catch (Exception e) {
    // 여기서 처리하면 예외 전파 중단
    return handleError(e);
}
// 예외가 catch되지 않으면 계속 전파됨
```

## 예외 처리 흐름 시나리오

### 시나리오 1: 기본 흐름 (GlobalExceptionHandler로 전파)

```
Infrastructure 레이어
  ↓ IamException 발생
  → catch 안 함 → 전파
Application 레이어
  → catch 안 함 → 전파
API 레이어 (Controller)
  → catch 안 함 → 전파
GlobalExceptionHandler
  → @ExceptionHandler로 catch → 처리
```

**코드 예시:**
```java
// RoleController.java
@PostMapping
public ApiResponse<Void> assignRole(@RequestBody RoleAssignRequest request) {
    // try-catch 없음 → 예외가 발생하면 GlobalExceptionHandler로 전파
    roleService.assignRoles(request.getEmail(), request.getRoles());
    return ApiResponse.success("Role이 부여되었습니다.", null);
}
```

### 시나리오 2: Controller에서 특정 API만 예외 처리

```
Infrastructure 레이어
  ↓ IamException 발생
  → catch 안 함 → 전파
Application 레이어
  → catch 안 함 → 전파
API 레이어 (Controller)
  → try-catch로 catch → 여기서 처리 → 전파 중단
GlobalExceptionHandler
  → 도달하지 않음 (예외가 이미 처리됨)
```

**코드 예시:**
```java
// RoleController.java
@PostMapping("/special")
public ApiResponse<Void> assignRoleSpecial(@RequestBody RoleAssignRequest request) {
    try {
        roleService.assignRoles(request.getEmail(), request.getRoles());
        return ApiResponse.success("Role이 부여되었습니다.", null);
    } catch (IamException e) {
        // 여기서 처리하면 GlobalExceptionHandler로 가지 않음
        log.error("특별한 처리 필요: {}", e.getMessage(), e);
        return ApiResponse.error("CUSTOM_ERROR", "특별한 에러 메시지");
    }
}
```

### 시나리오 3: Application 레이어에서 예외 처리

```
Infrastructure 레이어
  ↓ IamException 발생
  → catch 안 함 → 전파
Application 레이어 (Service)
  → try-catch로 catch → 처리 또는 다른 예외로 변환
API 레이어 (Controller)
  → 예외가 이미 처리되었거나 다른 예외로 변환됨
GlobalExceptionHandler
  → 변환된 예외를 처리 (원래 IamException이 아닌 경우)
```

**코드 예시:**
```java
// RoleService.java
public void assignRoles(String email, List<IamRole> roles) {
    try {
        iamClient.assignRoles(userId, roles);
    } catch (IamException e) {
        // Application 레이어에서 처리
        log.error("Role 부여 실패, 재시도 로직 실행", e);
        // 재시도 또는 다른 처리
        retryAssignRoles(userId, roles);
    }
}
```

## 언제 Controller에서 직접 예외 처리를 해야 할까?

### ✅ 적절한 경우

1. **특정 API만 다른 에러 응답이 필요한 경우**
   ```java
   @PostMapping("/admin/special")
   public ApiResponse<Void> adminSpecialAction(@RequestBody Request request) {
       try {
           service.doSomething();
           return ApiResponse.success("성공", null);
       } catch (IamException e) {
           // 관리자용 특별한 에러 메시지
           return ApiResponse.error("ADMIN_SPECIAL_ERROR", "관리자 전용 에러 처리");
       }
   }
   ```

2. **예외 발생 시 추가 비즈니스 로직이 필요한 경우**
   ```java
   @PostMapping("/with-fallback")
   public ApiResponse<Void> actionWithFallback(@RequestBody Request request) {
       try {
           service.primaryAction();
           return ApiResponse.success("성공", null);
       } catch (IamException e) {
           // 대체 로직 실행
           service.fallbackAction();
           return ApiResponse.success("대체 로직으로 성공", null);
       }
   }
   ```

3. **예외 발생 시 특정 상태 코드나 헤더가 필요한 경우**
   ```java
   @PostMapping("/custom-response")
   public ResponseEntity<ApiResponse<Void>> customResponse(@RequestBody Request request) {
       try {
           service.doSomething();
           return ResponseEntity.ok(ApiResponse.success("성공", null));
       } catch (IamException e) {
           // 특별한 헤더나 상태 코드 필요
           return ResponseEntity
               .status(HttpStatus.ACCEPTED)
               .header("X-Custom-Header", "value")
               .body(ApiResponse.error("CUSTOM", "에러"));
       }
   }
   ```

### ❌ 권장하지 않는 경우

1. **단순히 에러 메시지만 바꾸고 싶은 경우**
   - 이 경우는 GlobalExceptionHandler에서 처리하는 것이 더 좋습니다.
   - 예외 메시지를 세분화하려면 IamException에 errorCode를 추가하거나, GlobalExceptionHandler에서 예외 메시지를 분석하여 다른 응답을 반환하는 것이 좋습니다.

2. **모든 API에서 일관된 에러 처리가 필요한 경우**
   - GlobalExceptionHandler에서 처리하는 것이 일관성과 유지보수성에 좋습니다.

## 권장 패턴

### 패턴 1: GlobalExceptionHandler에서 일괄 처리 (기본)

**장점:**
- 일관성 있는 에러 응답
- 코드 중복 최소화
- 유지보수 용이

**단점:**
- 특별한 처리가 필요한 경우 유연성 부족

### 패턴 2: Controller에서 선택적 처리

**장점:**
- 특정 API에 대한 유연한 처리 가능

**단점:**
- 코드 중복 가능성
- 일관성 저하 가능성

### 패턴 3: 하이브리드 접근 (권장)

**기본은 GlobalExceptionHandler에서 처리하고, 특별한 경우만 Controller에서 처리**

```java
// GlobalExceptionHandler.java
@ExceptionHandler(IamException.class)
public ResponseEntity<ApiResponse<Object>> handleIamException(IamException e) {
    // 기본 처리
    log.error("IAM 오류 발생: {}", e.getMessage(), e);
    ApiResponse<Object> response = ApiResponse.error(
        ErrorCode.IAM_ERROR.getCode(),
        e.getMessage()
    );
    return ResponseEntity.status(ErrorCode.IAM_ERROR.getStatus()).body(response);
}

// RoleController.java
@PostMapping("/normal")
public ApiResponse<Void> normalAction(@RequestBody Request request) {
    // GlobalExceptionHandler에서 처리
    service.doSomething();
    return ApiResponse.success("성공", null);
}

@PostMapping("/special")
public ApiResponse<Void> specialAction(@RequestBody Request request) {
    try {
        service.doSomething();
        return ApiResponse.success("성공", null);
    } catch (IamException e) {
        // 특별한 처리 필요 시에만 Controller에서 처리
        return handleSpecialCase(e);
    }
}
```

## 예외 변환 패턴

### Application 레이어에서 예외 변환

```java
// RoleService.java
public void assignRoles(String email, List<IamRole> roles) {
    try {
        iamClient.assignRoles(userId, roles);
    } catch (IamException e) {
        // IamException을 BusinessException으로 변환
        throw new BusinessException(
            ErrorCode.IAM_ROLE_ASSIGN_FAILED.getCode(),
            "Role 부여에 실패했습니다: " + e.getMessage(),
            ErrorCode.IAM_ROLE_ASSIGN_FAILED.getStatus()
        );
    }
}
```

이 경우:
- `IamException`은 `BusinessException`으로 변환되어 전파
- `GlobalExceptionHandler`의 `handleBusinessException`에서 처리
- `handleIamException`은 호출되지 않음

## 결론

### 질문에 대한 답변

1. **중간 레이어에서 예외를 catch하면 GlobalExceptionHandler로 안 가나요?**
   - ✅ 네, 맞습니다. catch하고 처리하면 전파가 중단됩니다.

2. **Controller에서 특정 API만 예외 처리가 필요하면 그 API에만 try-catch를 넣으면 되나요?**
   - ✅ 네, 가능합니다. 하지만 신중하게 사용해야 합니다.

### 권장 사항

1. **기본 원칙**: GlobalExceptionHandler에서 일괄 처리
2. **예외 사항**: 특별한 비즈니스 로직이나 응답이 필요한 경우에만 Controller에서 처리
3. **일관성 유지**: 가능한 한 일관된 패턴 유지

### 실무 팁

- **예외 처리 로직이 복잡해지면**: 별도의 Handler 클래스로 분리
- **여러 API에서 같은 특별 처리가 필요하면**: GlobalExceptionHandler에서 조건부 처리 고려
- **예외 메시지 세분화가 필요하면**: 예외에 errorCode나 타입 정보 추가

