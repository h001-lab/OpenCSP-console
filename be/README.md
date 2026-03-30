# OpenCSP Console — Backend

Spring Boot 3.5 / Java 21 기반 REST API 서버.
Proxmox VM 프로비저닝(FluxCD + OpenTofu), Zitadel IAM 연동, WebSocket 콘솔 터미널 프록시를 제공한다.

---

## 요구 사항

- JDK 21
- (선택) Docker

---

## 빠른 시작

```bash
# 환경 변수 설정
cp .env.sample .env   # 필요한 값 채우기

# 개발 서버 실행 (기본: SQLite + IAM=none)
./gradlew bootRun

# 빌드 (테스트 포함)
./gradlew build

# 빌드 (테스트 제외)
./gradlew build -x test

# Docker
docker build -t opencsp-be .
docker run --rm --env-file .env -p 8080:8080 opencsp-be
```

기본 설정(`IAM_PROVIDER=none`)으로 실행하면 인증 없이 Admin 권한으로 접근할 수 있다.
Swagger UI: http://localhost:8080/swagger-ui.html

---

## 환경 변수

`.env.sample`을 복사해 `.env`로 사용한다. 주요 변수:

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `APP_IAM_PROVIDER` | IAM 공급자 (`none` / `zitadel`) | `none` |
| `APP_CONFIG_ENCRYPTION_KEY` | DB 저장 민감값 AES 암호화 키 (16자 이상 권장) | `opencsp-dev-key!` |
| `APP_K8S_ENABLED` | Kubernetes 연동 활성화 | `true` |
| `APP_K8S_API_SERVER` | k8s API 서버 URL | — |
| `APP_K8S_TOKEN` | k8s 서비스 토큰 | — |
| `SPRING_DATASOURCE_URL` | DB 연결 URL | SQLite `./opencsp.db` |
| `ZITADEL_ISSUER_URI` | Zitadel 발급자 URL (`IAM_PROVIDER=zitadel` 시 필수) | — |
| `ZITADEL_CLIENT_ID` | Zitadel OAuth2 클라이언트 ID | — |
| `ZITADEL_SERVICE_TOKEN` | Zitadel 서비스 계정 토큰 (사용자 관리용) | — |
| `APP_AI_ENABLED` | Spring AI 활성화 | `false` |

지원 DB: SQLite(기본) · H2 · MariaDB · PostgreSQL — `SPRING_DATASOURCE_*` 변수로 전환.

---

## 아키텍처

```
api/            REST 컨트롤러 + 요청/응답 DTO
application/    비즈니스 로직 서비스 (@Transactional)
domain/         JPA 엔티티 + 레포지토리 인터페이스
infrastructure/
  ├── security/     Spring Security (JWT, JIT 프로비저닝)
  ├── iam/          IAM 추상화 (zitadel/ · noop/)
  ├── persistence/  Spring Data JPA 구현체
  ├── k8s/          Kubernetes 연동 (flux/ · noop/)
  ├── teleport/     SSH PAM 프록시 (http/ · noop/)
  ├── websocket/    콘솔 터미널 WebSocket
  └── config/       DB 기반 동적 설정 (ConfigStore)
```

- 레포지토리 **인터페이스**는 `domain/`에, **구현체**는 `infrastructure/persistence/`에 위치한다.
- `noop/` 구현체는 외부 의존성 없이 로컬 개발이 가능하도록 한다.
- 런타임 설정값은 `ConfigStore`(DB 우선 → 환경변수 폴백)로 관리하며, UI에서 변경 가능하다.

---

## 코드 패턴

**도메인 엔티티**
```java
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Foo { ... }
// 생성: Foo.create(...) 정적 팩토리 메서드
```

**Response DTO** — Java record
```java
public record FooResponse(String id, String name) {
    public static FooResponse from(Foo foo) { ... }
}
```

**Request DTO** — `@Getter @NoArgsConstructor` (Jackson 역직렬화용)
```java
@Getter
@NoArgsConstructor
public class FooRequest {
    @NotBlank private String name;
}
```

---

## 테스트

```bash
./gradlew test                        # 전체 테스트
./gradlew test --tests "*.FooTest"    # 특정 테스트 클래스
```

테스트는 H2 인메모리 DB(`application-test.yaml`)로 실행된다.
