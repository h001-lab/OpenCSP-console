# JWT Role 디버깅 가이드

## 문제 상황

`/roles/me` API를 호출했을 때 roles가 빈 배열로 반환됩니다.

## 확인 사항

### 1. 현재 JWT 토큰에 role이 포함되어 있는지 확인

1. **JWT 토큰 디코딩**
   - https://jwt.io/ 접속
   - 현재 사용 중인 JWT 토큰을 붙여넣기
   - Decoded 섹션에서 확인

2. **확인할 내용**
   - `roles` 클레임이 있는지?
   - `urn:zitadel:iam:org:project:roles` 클레임이 있는지?
   - 다른 형태의 role 클레임이 있는지?
   - role 값의 형식은? (예: `["admin"]`, `["ADMIN"]`, `"admin"` 등)

### 2. 로그 확인

애플리케이션 로그에서 다음 메시지를 확인하세요:

```
DEBUG JWT Claims 전체: {...}
DEBUG Found 'roles' claim: ...
INFO Extracted roles from JWT: []
```

로그에서:
- JWT Claims 전체 내용 확인
- `roles` 클레임이 있는지 확인
- role 추출 실패 원인 확인

### 3. 가능한 원인

#### 원인 1: JWT에 role이 없음
- **증상**: JWT 토큰에 role 클레임이 전혀 없음
- **해결**: 
  - Zitadel에서 Project role을 scope로 요청하도록 설정
  - 새로 로그인하여 scope가 포함된 토큰 발급
  - 또는 Management API로 role 조회 (현재는 제거됨)

#### 원인 2: Role 클레임 경로가 다름
- **증상**: JWT에 role이 있지만 다른 경로에 있음
- **예시**: 
  - `urn:zitadel:iam:org:project:roles` 경로에 있음
  - `org.roles` 경로에 있음
  - 다른 커스텀 경로에 있음
- **해결**: 코드에서 해당 경로를 찾도록 수정

#### 원인 3: Role 값 형식이 다름
- **증상**: JWT에 role이 있지만 형식이 다름
- **예시**:
  - `["admin"]` 대신 `["ADMIN"]` 형식
  - `"admin"` 대신 `"urn:zitadel:iam:org:project:role:admin"` 형식
- **해결**: `IamRole.fromString()` 메서드 수정 또는 role 값 변환 로직 추가

#### 원인 4: Scope 설정이 반영되지 않음
- **증상**: `application.yaml`에 scope를 추가했지만 JWT에 포함되지 않음
- **해결**:
  - Zitadel 클라이언트 설정에서 해당 scope를 허용하도록 설정
  - 새로 로그인하여 scope가 포함된 토큰 발급

## 해결 방법

### 방법 1: JWT에 role이 없는 경우

현재 사용 중인 JWT 토큰은 이미 발급받은 것이므로, `application.yaml`의 scope 설정이 반영되지 않았을 수 있습니다.

**해결책**:
1. Zitadel에서 로그인할 때 scope를 포함하여 요청
2. 프론트엔드에서 로그인 시 scope 포함
3. 또는 Management API로 role 조회 (성능 오버헤드 있음)

### 방법 2: Role 클레임 경로가 다른 경우

로그에서 JWT Claims 전체를 확인하여 role이 어떤 경로에 있는지 확인한 후, 코드를 수정합니다.

**예시 수정**:
```java
// 예: urn:zitadel:iam:org:project:roles 경로에 있는 경우
Object projectRoles = claims.get("urn:zitadel:iam:org:project:roles");
if (projectRoles instanceof List) {
    // role 추출 로직
}
```

### 방법 3: Role 값 형식이 다른 경우

JWT에서 role 값이 `"ADMIN"` 형식이면 `IamRole.fromString()`이 대소문자를 구분하지 않으므로 문제없지만, 
`"urn:zitadel:iam:org:project:role:admin"` 형식이면 변환이 필요합니다.

**예시 수정**:
```java
String roleString = (String) role;
// urn: 접두사 제거
if (roleString.startsWith("urn:zitadel:iam:org:project:role:")) {
    roleString = roleString.substring("urn:zitadel:iam:org:project:role:".length());
}
IamRole iamRole = IamRole.fromString(roleString);
```

## 다음 단계

1. **JWT 토큰 확인**: jwt.io에서 현재 토큰 디코딩하여 role 클레임 확인
2. **로그 확인**: 애플리케이션 로그에서 "JWT Claims 전체" 메시지 확인
3. **결과 공유**: JWT에 role이 있는지, 어떤 경로에 있는지, 어떤 형식인지 알려주시면 코드 수정하겠습니다

