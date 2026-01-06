# 예외 처리 가이드라인

## 개요

이 문서는 프로젝트에서 사용하는 예외 처리 패턴과 가이드라인을 설명합니다.

## 예외 계층 구조

### IamException
- **위치**: `infrastructure.iam.IamException`
- **성격**: 예상 가능한 비즈니스 예외
- **용도**: IAM API 호출 실패, 사용자 조회 실패 등

### BusinessException
- **위치**: `common.exception.BusinessException`
- **성격**: 애플리케이션 레벨의 비즈니스 예외
- **용도**: 비즈니스 규칙 위반 등

## 레이어별 예외 처리 패턴

### Infrastructure 레이어 (예: ZitadelClient)

**원칙**: 
- `IamException`은 로깅 없이 그대로 전파
- 예상치 못한 `Exception`은 로깅 후 `IamException`으로 래핑

**이유**:
1. **중복 로깅 방지**: 전역 예외 핸들러에서 로깅하므로 Infrastructure에서 또 로깅하면 중복
2. **레이어 책임 분리**: Infrastructure는 예상치 못한 예외만 로깅하고, 비즈니스 예외는 상위로 전파
3. **예외의 성격**: `IamException`은 이미 적절한 메시지를 포함한 예상 가능한 예외

**예시 코드**:
```java
public String getUserSubjectByEmail(String email) throws IamException {
    try {
        ZitadelUserDto.ListUsersResponse.User user = userExecutor.findUserByEmail(email);
        // ...
    } catch (IamException e) {
        throw e;  // 로깅 없이 전파
    } catch (Exception e) {
        log.error("Zitadel 사용자 조회 중 예외 발생: email={}", email, e);
        throw new IamException("Zitadel 사용자 조회 중 예외 발생: " + e.getMessage(), e);
    }
}
```

### API 레이어 (예: RoleController)

**원칙**:
- `IamException`을 처리하지 않고 그대로 전파
- 전역 예외 핸들러(`GlobalExceptionHandler`)에서 처리

**예시 코드**:
```java
@PostMapping
public ApiResponse<Void> assignRole(@RequestBody @Valid RoleAssignRequest request) {
    // try-catch 불필요, GlobalExceptionHandler에서 처리
    roleService.assignRoles(request.getEmail(), request.getRoles());
    return ApiResponse.success("Role이 부여되었습니다.", null);
}
```

### 전역 예외 핸들러 (GlobalExceptionHandler)

**원칙**:
- 모든 예외를 중앙에서 처리
- `IamException`을 catch하여 로깅하고 사용자에게 적절한 에러 응답 반환

**예시 코드**:
```java
@ExceptionHandler(IamException.class)
public ResponseEntity<ApiResponse<Object>> handleIamException(IamException e) {
    log.error("IAM 오류 발생: {}", e.getMessage(), e);
    ApiResponse<Object> response = ApiResponse.error(
        ErrorCode.IAM_ERROR.getCode(),
        e.getMessage()
    );
    return ResponseEntity.status(ErrorCode.IAM_ERROR.getStatus()).body(response);
}
```

## 예외 처리 흐름

### IamException 처리 흐름
```
Infrastructure 레이어 (ZitadelClient)
  ↓ IamException 발생
  → 로깅 없이 그대로 전파
  ↓
Application 레이어 (RoleService)
  → 그대로 전파
  ↓
API 레이어 (RoleController)
  → 그대로 전파 (처리 안 함)
  ↓
GlobalExceptionHandler
  → catch하여 로깅 + 사용자에게 에러 응답
```

### 예상치 못한 Exception 처리 흐름
```
Infrastructure 레이어 (ZitadelClient)
  ↓ 예상치 못한 Exception 발생
  → 로깅 후 IamException으로 래핑
  ↓
Application 레이어 (RoleService)
  → 그대로 전파
  ↓
API 레이어 (RoleController)
  → 그대로 전파 (처리 안 함)
  ↓
GlobalExceptionHandler
  → catch하여 로깅 + 사용자에게 에러 응답
```

## 주의사항

1. **중복 로깅 방지**: 같은 예외를 여러 레이어에서 로깅하지 않도록 주의
2. **예외 래핑**: 예상치 못한 예외만 래핑하고, 이미 적절한 예외는 그대로 전파
3. **에러 메시지**: 사용자에게 보여줄 메시지는 명확하고 이해하기 쉽게 작성

## 참고

- `IamException` 클래스 JavaDoc 참고
- `ZitadelClient` 클래스 JavaDoc 참고
- `GlobalExceptionHandler`에서 전역 예외 처리 확인

