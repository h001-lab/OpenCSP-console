# 예외 처리 아키텍처 분석 및 개선 방향

## 현재 구조 분석

### 현재 예외 처리 패턴

#### 1. IamException 처리
```
Infrastructure (ZitadelClient)
  ↓ IamException 발생
  → 로깅 없이 전파
Application (RoleService)
  → 그대로 전파
API (RoleController)
  → try-catch로 직접 처리 + 로깅 + ApiResponse 반환
```

#### 2. BusinessException 처리
```
Application (UserService)
  ↓ BusinessException 발생
  → 그대로 전파
API (UserController)
  → 전파 (처리 안 함)
GlobalExceptionHandler
  → @ExceptionHandler로 처리 + 로깅 + ApiResponse 반환
```

### 문제점

1. **일관성 부족**
   - `IamException`: Controller에서 직접 처리
   - `BusinessException`: `GlobalExceptionHandler`에서 처리
   - 같은 성격의 예외인데 처리 방식이 다름

2. **코드 중복**
   - 모든 Controller에서 `IamException`을 try-catch로 처리
   - 로깅 로직이 반복됨
   - 에러 코드가 하드코딩됨 (`"ROLE_ASSIGN_FAILED"`)

3. **확장성 부족**
   - 새로운 예외 타입 추가 시 모든 Controller 수정 필요
   - 에러 코드 관리가 분산됨

4. **책임 분리 미흡**
   - Controller가 예외 처리 로직까지 담당
   - 비즈니스 로직과 예외 처리가 섞임

---

## 표준 예외 처리 패턴

### 1. 예외 전파는 표준입니다 ✅

**레이어 간 예외 전파는 올바른 패턴입니다.**

#### 이유:
- **관심사 분리**: 각 레이어는 자신의 책임에만 집중
- **재사용성**: 예외 처리를 한 곳에서 관리
- **유지보수성**: 예외 처리 로직 변경 시 한 곳만 수정

#### 표준 패턴:
```
Infrastructure Layer
  → 예외 발생 (예: IamException)
  → 로깅 없이 전파 (비즈니스 예외는 상위에서 처리)
  
Application Layer
  → 예외 전파 (변환 없이)
  
API Layer
  → 예외 전파 (처리 안 함)
  
GlobalExceptionHandler (@RestControllerAdvice)
  → 모든 예외를 한 곳에서 처리
  → 로깅 + HTTP 응답 변환
```

### 2. 전역 예외 핸들러 사용 권장 ✅

**`@RestControllerAdvice`를 사용하는 것이 표준입니다.**

#### 장점:
- **일관성**: 모든 예외를 동일한 방식으로 처리
- **중앙 집중화**: 예외 처리 로직이 한 곳에 모임
- **코드 간소화**: Controller에서 try-catch 불필요
- **에러 코드 관리**: ErrorCode enum으로 체계적 관리

---

## 개선 방향 제안

### 현재 문제점 해결 방안

#### 1. IamException을 GlobalExceptionHandler에서 처리

**현재:**
```java
// RoleController.java
@PostMapping
public ApiResponse<Void> assignRole(@RequestBody @Valid RoleAssignRequest request) {
    try {
        roleService.assignRoles(request.getEmail(), request.getRoles());
        return ApiResponse.success("Role이 부여되었습니다.", null);
    } catch (IamException e) {
        log.error("Role 부여 실패: email={}, roles={}", request.getEmail(), request.getRoles(), e);
        return ApiResponse.error("ROLE_ASSIGN_FAILED", "Role 부여에 실패했습니다: " + e.getMessage());
    }
}
```

**개선 후:**
```java
// RoleController.java
@PostMapping
public ApiResponse<Void> assignRole(@RequestBody @Valid RoleAssignRequest request) {
    roleService.assignRoles(request.getEmail(), request.getRoles());
    return ApiResponse.success("Role이 부여되었습니다.", null);
}

// GlobalExceptionHandler.java
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

#### 2. ErrorCode 확장

**현재:**
```java
public enum ErrorCode {
    USER_NOT_FOUND("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.", 404),
    // ...
}
```

**개선 후:**
```java
public enum ErrorCode {
    // User 관련
    USER_NOT_FOUND("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.", 404),
    USER_ALREADY_EXISTS("USER_ALREADY_EXISTS", "이미 존재하는 사용자입니다.", 409),
    
    // IAM 관련
    IAM_ERROR("IAM_ERROR", "IAM 처리 중 오류가 발생했습니다.", 500),
    IAM_USER_NOT_FOUND("IAM_USER_NOT_FOUND", "IAM에서 사용자를 찾을 수 없습니다.", 404),
    IAM_ROLE_ASSIGN_FAILED("IAM_ROLE_ASSIGN_FAILED", "Role 부여에 실패했습니다.", 500),
    IAM_ROLE_REMOVE_FAILED("IAM_ROLE_REMOVE_FAILED", "Role 제거에 실패했습니다.", 500),
    
    // 공통
    INVALID_INPUT("INVALID_INPUT", "잘못된 입력입니다.", 400),
    UNAUTHORIZED("UNAUTHORIZED", "인증이 필요합니다.", 401),
    FORBIDDEN("FORBIDDEN", "접근 권한이 없습니다.", 403),
    INTERNAL_SERVER_ERROR("INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다.", 500);
}
```

#### 3. IamException에 ErrorCode 추가 (선택사항)

**개선 방안 A: IamException에 errorCode 필드 추가**
```java
public class IamException extends RuntimeException {
    private final String errorCode;
    
    public IamException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
    
    // GlobalExceptionHandler에서 errorCode 사용
}
```

**개선 방안 B: IamException을 그대로 사용하고 GlobalExceptionHandler에서 매핑**
```java
// GlobalExceptionHandler.java
@ExceptionHandler(IamException.class)
public ResponseEntity<ApiResponse<Object>> handleIamException(IamException e) {
    log.error("IAM 오류 발생: {}", e.getMessage(), e);
    
    // 예외 메시지에 따라 적절한 ErrorCode 매핑
    ErrorCode errorCode = mapIamExceptionToErrorCode(e);
    
    ApiResponse<Object> response = ApiResponse.error(
        errorCode.getCode(),
        errorCode.getMessage()
    );
    return ResponseEntity.status(errorCode.getStatus()).body(response);
}
```

---

## 예외 처리 기능 확장 제안

### 현재 기능
- ✅ 로깅
- ✅ HTTP 응답 변환
- ✅ 에러 코드 관리 (부분적)

### 추가 고려 사항

#### 1. 에러 코드 체계화 ⭐⭐⭐ (높은 우선순위)
- **현재**: 하드코딩된 문자열 (`"ROLE_ASSIGN_FAILED"`)
- **개선**: ErrorCode enum으로 통일
- **장점**: 타입 안정성, 자동완성, 중앙 관리

#### 2. 예외 메시지 국제화 (i18n) ⭐ (낮은 우선순위)
- **필요 시**: 다국어 지원
- **현재**: 한국어 메시지로 충분

#### 3. 예외 추적 및 모니터링 ⭐⭐ (중간 우선순위)
- **필요 시**: 
  - 예외 발생 빈도 추적
  - 알림 시스템 연동 (Slack, Email 등)
  - 메트릭 수집 (Prometheus, Micrometer)

#### 4. 예외 상세 정보 제어 ⭐⭐ (중간 우선순위)
- **보안**: 프로덕션에서는 상세 에러 메시지 숨김
- **개발**: 개발 환경에서는 상세 스택 트레이스 제공

```java
@ExceptionHandler(IamException.class)
public ResponseEntity<ApiResponse<Object>> handleIamException(IamException e) {
    log.error("IAM 오류 발생: {}", e.getMessage(), e);
    
    // 프로덕션에서는 상세 메시지 숨김
    String message = isProduction() 
        ? "IAM 처리 중 오류가 발생했습니다." 
        : e.getMessage();
    
    ApiResponse<Object> response = ApiResponse.error(
        ErrorCode.IAM_ERROR.getCode(),
        message
    );
    return ResponseEntity.status(ErrorCode.IAM_ERROR.getStatus()).body(response);
}
```

#### 5. 예외 분류 및 세분화 ⭐⭐⭐ (높은 우선순위)
- **현재**: `IamException` 하나로 모든 IAM 오류 처리
- **개선**: 예외 타입별로 세분화 (선택사항)

```java
// 선택사항: 예외 세분화
public class IamUserNotFoundException extends IamException {
    public IamUserNotFoundException(String email) {
        super("IAM_USER_NOT_FOUND", "사용자를 찾을 수 없습니다: " + email);
    }
}

public class IamRoleAssignmentException extends IamException {
    public IamRoleAssignmentException(String message) {
        super("IAM_ROLE_ASSIGN_FAILED", message);
    }
}
```

---

## 권장 개선 사항 (우선순위 순)

### 1순위: 전역 예외 핸들러로 통일 ⭐⭐⭐
- `IamException`을 `GlobalExceptionHandler`에서 처리
- Controller에서 try-catch 제거
- 코드 간소화 및 일관성 확보

### 2순위: ErrorCode 체계화 ⭐⭐⭐
- IAM 관련 ErrorCode 추가
- 하드코딩된 문자열 제거
- 타입 안정성 확보

### 3순위: 예외 메시지 개선 ⭐⭐
- 사용자 친화적인 메시지
- 개발/프로덕션 환경별 메시지 제어

### 4순위: 모니터링 및 추적 ⭐
- 필요 시 추가
- 현재는 로깅으로 충분

---

## 결론

### 질문 1: 예외를 여러 레이어에 걸쳐 전파하는 것이 표준인가?

**답변: ✅ 네, 표준입니다.**

- 레이어 간 예외 전파는 올바른 패턴
- 각 레이어는 자신의 책임에만 집중
- 예외 처리는 전역 핸들러에서 중앙 집중화

### 질문 2: 현재 예외 처리에 로깅 외에 다른 기능이 없는데 어떻게 생각하는가?

**답변: 현재는 충분하지만, 개선 여지가 있습니다.**

#### 현재 상태 평가:
- ✅ **로깅**: 충분히 구현됨
- ✅ **HTTP 응답 변환**: 구현됨
- ⚠️ **에러 코드 관리**: 부분적 (하드코딩 존재)
- ⚠️ **일관성**: 부족 (Controller 직접 처리 vs GlobalHandler)

#### 개선 필요 사항:
1. **전역 예외 핸들러로 통일** (가장 중요)
2. **ErrorCode 체계화** (타입 안정성)
3. **예외 메시지 개선** (사용자 경험)

#### 추가 기능 (선택사항):
- 모니터링/알림: 필요 시 추가
- i18n: 다국어 지원 필요 시 추가
- 예외 세분화: 복잡도 증가 시 고려

---

## 다음 단계

1. **즉시 개선**: `IamException`을 `GlobalExceptionHandler`로 이동
2. **ErrorCode 확장**: IAM 관련 에러 코드 추가
3. **Controller 정리**: try-catch 제거
4. **테스트**: 예외 처리 시나리오 검증

