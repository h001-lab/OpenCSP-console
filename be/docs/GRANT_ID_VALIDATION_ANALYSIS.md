# Grant ID 검증 전략 분석: null 반환이 가능한가?

## 질문

1. `findAuthorizationId`가 null을 반환하는 것이 절대 있을 수 없는 경우인가?
2. `getUserRoles`는 빈 리스트를 반환할 수 있는데, `findAuthorizationId`는 왜 예외를 던지는가?
3. 이건 그럴 일이 있으면 안 되는 함수들인가?

## 각 메서드의 사용 맥락 분석

### 1. `findAuthorizationId` 사용 맥락

#### 사용처 1: `assignRoles`의 409 처리 (77줄)

```java
catch (IamException e) {
    if (cause.getStatusCode().value() == 409) {
        // grant가 이미 존재하면 기존 role과 병합하여 UpdateAuthorization 사용
        String grantId = findAuthorizationId(userId);  // ← 여기서 사용
        // ...
    }
}
```

**상황 분석:**
- 409 Conflict 에러가 발생했다는 것은 **grant가 이미 존재한다**는 의미
- 그런데 `listAuthorizations`를 호출했을 때 grant가 없다면?
  - **이론적으로는 가능**: Race condition, 데이터 불일치, 타이밍 이슈
  - **실제로는 매우 드묾**: 409 에러가 발생했다는 것은 grant가 존재한다는 강한 신호

**결론**: 이 경우 grantId가 없으면 **논리적으로 모순**이지만, 기술적으로는 가능할 수 있음

#### 사용처 2: `removeRole` (111줄)

```java
public void removeRole(String userId, IamRole role) throws IamException {
    String grantId = findAuthorizationId(userId);  // ← 여기서 사용
    
    // grantId로 updateAuthorization 호출
    authExecutor.updateAuthorization(grantId, updatedRoleKeys);
}
```

**상황 분석:**
- role을 제거하려면 **grant가 반드시 있어야 함**
- grant가 없으면 role을 제거할 수 없음
- 따라서 grantId가 없으면 **예외가 맞음**

**결론**: 이 경우 grantId가 없으면 **비즈니스 로직상 불가능**

### 2. `getUserRoles` 사용 맥락

```java
public List<IamRole> getUserRoles(String userId) throws IamException {
    ZitadelAuthorizationDto.ListResponse response = authExecutor.listAuthorizations(userId);
    
    // grant가 없어도 빈 리스트 반환
    if (response == null || response.authorizations().isEmpty()) {
        return new ArrayList<>();  // 빈 리스트 반환
    }
}
```

**상황 분석:**
- 단순 조회 메서드
- role이 없는 것은 **정상적인 경우**일 수 있음
- 빈 리스트를 반환하는 것이 합리적

**결론**: grant가 없어도 **정상적인 경우**일 수 있음

### 3. `getCurrentRoleKeys` 사용 맥락

#### 사용처 1: `assignRoles`의 409 처리 (80줄)

```java
catch (IamException e) {
    if (cause.getStatusCode().value() == 409) {
        List<String> currentRoleKeys = getCurrentRoleKeys(userId);  // ← 여기서 사용
        
        // 빈 리스트면 그냥 병합하면 됨
        List<String> mergedRoleKeys = new ArrayList<>(currentRoleKeys);
        // ...
    }
}
```

**상황 분석:**
- 빈 리스트면 그냥 병합하면 됨
- grant가 있어도 roleKeys가 비어있을 수 있음

**결론**: 빈 리스트 반환이 합리적

#### 사용처 2: `removeRole` (114줄)

```java
public void removeRole(String userId, IamRole role) throws IamException {
    List<String> currentRoleKeys = getCurrentRoleKeys(userId);  // ← 여기서 사용
    
    // 빈 리스트면 필터링해도 빈 리스트
    List<String> updatedRoleKeys = currentRoleKeys.stream()
        .filter(roleKey -> !roleKey.equals(role.getValue()))
        .toList();
}
```

**상황 분석:**
- 빈 리스트면 필터링해도 빈 리스트
- grant가 있어도 roleKeys가 비어있을 수 있음

**결론**: 빈 리스트 반환이 합리적

## null 반환 가능성 분석

### `findAuthorizationId`가 null을 반환할 수 있는 경우

#### 케이스 1: `assignRoles`의 409 처리에서

**시나리오:**
1. `createAuthorization` 호출 → 409 Conflict (grant 존재)
2. `listAuthorizations` 호출 → grant 없음 (???)

**가능성:**
- ⚠️ **Race condition**: 다른 프로세스가 grant를 삭제
- ⚠️ **데이터 불일치**: Zitadel 내부 데이터 불일치
- ⚠️ **타이밍 이슈**: 매우 짧은 시간 내 grant 생성/삭제
- ⚠️ **버그**: Zitadel API 버그

**확률**: 매우 낮음 (하지만 0%는 아님)

**처리 방법:**
- 현재 방식 (예외): 명확한 에러 메시지, 빠른 실패 ✅
- null 반환: 호출하는 쪽에서 처리 필요, 덜 명확한 에러

#### 케이스 2: `removeRole`에서

**시나리오:**
1. role을 제거하려고 함
2. grant가 없음

**가능성:**
- ✅ **정상적인 경우**: grant가 없으면 role을 제거할 수 없음

**처리 방법:**
- 현재 방식 (예외): 명확한 에러 메시지 ✅
- null 반환: 의미 없음 (role을 제거할 수 없으므로)

## 비교 분석

### `getUserRoles` vs `findAuthorizationId`

| 항목 | `getUserRoles` | `findAuthorizationId` |
|------|---------------|---------------------|
| **목적** | role 목록 조회 | grantId 조회 |
| **grant 없을 때** | 정상 (role 없음) | 비정상 (다음 로직 불가) |
| **반환값** | 빈 리스트 | 예외 |
| **이유** | role이 없는 것은 정상 | grantId 없으면 다음 로직 불가 |

### `getCurrentRoleKeys` vs `findAuthorizationId`

| 항목 | `getCurrentRoleKeys` | `findAuthorizationId` |
|------|---------------------|---------------------|
| **목적** | roleKeys 조회 | grantId 조회 |
| **grant 없을 때** | 빈 리스트 반환 | 예외 |
| **이유** | 빈 리스트면 병합/필터링 가능 | grantId 없으면 updateAuthorization 불가 |

## 결론

### `findAuthorizationId`가 null을 반환할 수 있는가?

**기술적으로는 가능하지만, 비즈니스 로직상 불가능한 경우가 대부분입니다.**

#### 케이스별 분석

1. **`removeRole`에서 사용**: 
   - grant가 없으면 role을 제거할 수 없음
   - **예외가 맞음** ✅

2. **`assignRoles`의 409 처리에서 사용**:
   - 409 에러가 발생했다는 것은 grant가 존재한다는 의미
   - grantId가 없으면 논리적으로 모순이지만 기술적으로는 가능
   - **예외가 더 안전함** ✅

### 권장사항

**현재 방식 유지 (예외 던지기)**

**이유:**
1. **명확한 책임**: `findAuthorizationId`는 grantId를 찾는 책임, 없으면 예외
2. **빠른 실패**: 불필요한 API 호출 방지
3. **명확한 에러 메시지**: 문제를 정확히 알 수 있음
4. **비즈니스 로직 보호**: grantId가 없으면 다음 로직을 수행할 수 없음

### 대안: Optional 사용 (선택사항)

만약 null 반환을 고려한다면 Optional을 사용하는 것이 더 안전합니다:

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
    // ...
}
```

하지만 이 경우에도 결국 예외를 던지므로, 현재 방식과 큰 차이가 없습니다.

## 최종 답변

### 질문 1: `findAuthorizationId`가 null을 반환하는 것이 절대 있을 수 없는 경우인가?

**답변**: 기술적으로는 가능하지만, 비즈니스 로직상 대부분의 경우 불가능합니다.

### 질문 2: `getUserRoles`는 빈 리스트를 반환할 수 있는데, `findAuthorizationId`는 왜 예외를 던지는가?

**답변**: 
- `getUserRoles`: role이 없는 것은 정상적인 경우
- `findAuthorizationId`: grantId가 없으면 다음 로직을 수행할 수 없음

### 질문 3: 이건 그럴 일이 있으면 안 되는 함수들인가?

**답변**: 
- `removeRole`에서 사용: grant가 없으면 role을 제거할 수 없으므로 예외가 맞음
- `assignRoles`의 409 처리에서 사용: 409 에러가 발생했다는 것은 grant가 존재한다는 의미이므로, grantId가 없으면 예외가 맞음

**결론**: 현재 방식 (예외 던지기)이 올바른 접근입니다.

