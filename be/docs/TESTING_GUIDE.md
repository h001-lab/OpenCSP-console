# 테스트 가이드

FE 없이 백엔드 API를 테스트하는 방법을 안내합니다.

## 1. Swagger UI 사용 (가장 편리한 방법) ⭐

### Swagger UI 접근

1. **애플리케이션 실행**
   ```bash
   cd be
   ./gradlew bootRun
   ```

2. **Swagger UI 접속**
   - 브라우저에서 `http://localhost:8080/swagger-ui.html` 접속
   - 또는 `http://localhost:8080/swagger-ui/index.html`

3. **JWT 토큰 설정**
   - Swagger UI 우측 상단의 **"Authorize"** 버튼 클릭
   - "bearer-jwt" 필드에 Zitadel에서 발급받은 JWT 토큰 입력
     - **주의**: `Bearer ` 접두사는 자동으로 추가되므로 토큰만 입력하면 됩니다
   - "Authorize" 버튼 클릭

4. **API 테스트**
   - Swagger UI에서 원하는 API 엔드포인트 선택
   - "Try it out" 버튼 클릭
   - 필요한 파라미터 입력 후 "Execute" 버튼 클릭
   - 응답 결과 확인

### 장점

- ✅ GUI로 직관적인 API 테스트
- ✅ API 문서와 테스트를 한 곳에서 수행
- ✅ JWT 토큰을 한 번만 입력하면 모든 API 호출에 자동 적용
- ✅ 요청/응답을 바로 확인 가능

### 예시

1. Zitadel에서 로그인하여 JWT 토큰 발급
   - 자세한 방법은 [Zitadel JWT 토큰 발급 가이드](./ZITADEL_JWT_TOKEN_GUIDE.md) 참조
2. Swagger UI에서 "Authorize" 버튼으로 토큰 입력
3. `/users/api/me` 엔드포인트로 자신의 정보 조회
4. `/users/example/admin-only` 엔드포인트로 권한 체크 확인

## 2. 통합 테스트 (자동화)

### Spring Security Test 사용

프로젝트에 이미 `UserControllerSecurityTest.java`가 포함되어 있습니다. 이 테스트는:
- JWT 토큰을 모킹하여 인증 테스트
- Role 기반 권한 체크 테스트
- MockMvc를 사용한 API 엔드포인트 테스트

### 테스트 실행

```bash
cd be
./gradlew test
```

특정 테스트만 실행:
```bash
./gradlew test --tests UserControllerSecurityTest
```

**참고**: 일부 테스트는 실제 OAuth2 로그인 플로우를 거쳐야 하므로 실패할 수 있습니다. 
이는 정상이며, 실제 환경에서 테스트해야 합니다.

## 2. Postman/Insomnia 사용 (실제 환경 테스트 권장)

### 실제 JWT 토큰으로 테스트

1. **Zitadel에서 JWT 토큰 발급**
   - 자세한 방법은 [Zitadel JWT 토큰 발급 가이드](./ZITADEL_JWT_TOKEN_GUIDE.md) 참조
   - 주요 방법:
     - 브라우저 개발자 도구에서 로그인 후 토큰 추출
     - Zitadel Management API로 토큰 발급
     - OAuth2 로그인 플로우를 통한 토큰 발급

2. **Postman 설정**
   - Authorization 탭 → Type: Bearer Token
   - Token 필드에 JWT 토큰 입력

3. **API 호출 예시**
   ```
   GET http://localhost:8080/users/api/me
   Authorization: Bearer <your-jwt-token>
   ```

### Role 기반 권한 테스트

다양한 role을 가진 사용자로 로그인하여 테스트:
- `admin` role: ADMIN 전용 API 접근 가능
- `userA` role: USER_A 접근 가능 API 접근 가능
- role 없음: 권한이 필요한 API 접근 불가

### 예시 API 엔드포인트

#### 인증된 사용자 정보 조회
```http
GET /users/api/me
Authorization: Bearer <jwt-token>
```

#### ADMIN 전용 API
```http
GET /users/example/admin-only
Authorization: Bearer <admin-jwt-token>
```

#### ADMIN 또는 USER_A 접근 가능 API
```http
GET /users/example/admin-or-user-a
Authorization: Bearer <usera-jwt-token>
```

## 3. curl 사용

### 기본 인증 요청

```bash
# JWT 토큰으로 인증된 요청
curl -X GET http://localhost:8080/users/api/me \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Role 기반 권한 테스트

```bash
# ADMIN role이 필요한 API
curl -X GET http://localhost:8080/users/example/admin-only \
  -H "Authorization: Bearer <admin-jwt-token>"

# USER_A role이 필요한 API
curl -X GET http://localhost:8080/users/example/admin-or-user-a \
  -H "Authorization: Bearer <usera-jwt-token>"
```

### 사용자 생성

```bash
curl -X POST http://localhost:8080/users \
  -H "Authorization: Bearer <jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "name": "New User"
  }'
```

## 4. 테스트 환경 설정

### application-test.yaml

테스트 환경에서는 H2 인메모리 DB를 사용합니다:
- 별도의 DB 설정 불필요
- 테스트 후 자동으로 데이터 정리

### JWT 토큰 모킹

테스트에서는 실제 Zitadel 연결 없이 JWT 토큰을 모킹합니다:
- `@WithMockJwt` 또는 `jwt()` 메서드 사용
- Role 정보를 직접 설정하여 테스트

## 5. 실제 환경 테스트 체크리스트

실제 Zitadel과 연동하여 테스트할 때 확인할 사항:

- [ ] JWT 토큰에서 role 클레임이 올바르게 추출되는지
- [ ] `@PreAuthorize` 권한 체크가 정상 동작하는지
- [ ] Zitadel Management API 호출이 정상 동작하는지 (role 부여/조회)
- [ ] JIT User Provisioning이 정상 동작하는지 (첫 로그인 시 role 부여)

## 6. 디버깅 팁

### JWT 토큰 내용 확인

JWT 토큰을 디코딩하여 claims 확인:
- https://jwt.io/ 에서 토큰 디코딩
- `roles` 클레임이 올바르게 포함되어 있는지 확인

### 로그 레벨 조정

`application-test.yaml`에서 로그 레벨 조정:
```yaml
logging:
  level:
    org.springframework.security: DEBUG
    io.hlab.OpenConsole: DEBUG
```

### Security Context 확인

테스트 중 Security Context에 올바른 권한이 설정되었는지 확인:
```java
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
Collection<? extends GrantedAuthority> authorities = auth.getAuthorities();
```

### 실제 응답 확인

테스트 실패 시 실제 응답 내용 확인:
```java
mockMvc.perform(get("/users/api/me")
        .with(jwt().jwt(jwtWithUserARole)))
    .andDo(print()) // 응답 내용 출력
    .andExpect(status().isOk());
```

## 7. 알려진 제한사항

1. **OidcUser vs JWT**: `getMyInfo` 엔드포인트는 `OidcUser`를 사용하므로, 
   JWT 토큰만으로는 완전히 테스트하기 어려울 수 있습니다. 
   실제 OAuth2 로그인 플로우를 거쳐야 합니다.

2. **Zitadel 연동**: 테스트 환경에서는 실제 Zitadel과 연동하지 않으므로,
   실제 환경에서 최종 검증이 필요합니다.

3. **Role 클레임 경로**: Zitadel의 실제 role 클레임 경로는 환경에 따라 다를 수 있으므로,
   `SecurityConfig.extractRoles()` 메서드를 조정해야 할 수 있습니다.
