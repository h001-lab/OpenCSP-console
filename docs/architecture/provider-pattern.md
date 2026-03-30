# Provider Pattern — OpenCSP 인프라 추상화 아키텍처

## 개요

OpenCSP는 IAM, Billing, K8s 등 외부 시스템 연동이 필요한 도메인에서 **Routing(Strategy) 패턴**을 사용한다.
구현체는 런타임에 DB(ConfigStore)에 저장된 `provider` 값을 기준으로 선택되며, 앱 재시작 없이 전환이 가능하다.

---

## ConfigStore — 계층적 설정 저장소

`ConfigStore`는 모든 런타임 설정의 단일 진입점이다.

```
조회 우선순위: DB > 환경변수 > 코드 기본값
```

### 카테고리 구조

| 카테고리 | 용도 | env 매핑 접두사 |
|----------|------|-----------------|
| `GENERAL` | 공통 설정 (provider 선택 등) | `app.*` |
| `IAM` | IAM 공급자 자격증명 | (키 그대로) `zitadel.*` 등 |
| `K8S` | Kubernetes/FluxCD 설정 | `app.k8s.*` |
| `AI` | AI 모델 설정 | `spring.ai.*` |

### API

```java
// DB 우선, 없으면 env, 없으면 기본값
configStore.get(ConfigCategory.GENERAL, "iam.provider", "none");

// DB에 저장 (민감값이면 AES-128-CBC 암호화)
configStore.set(ConfigCategory.IAM, "zitadel.client-secret", value, sensitive=true, ...);

// 카테고리 전체 조회 (DB 항목만)
configStore.getAll(ConfigCategory.IAM);
```

### Admin API

```
GET    /api/admin/configs              # 전체 조회
GET    /api/admin/configs/{category}   # 카테고리별 조회
PUT    /api/admin/configs              # 저장/수정
DELETE /api/admin/configs/{cat}/{key}  # 삭제 (env 폴백으로 복귀)
```

---

## Provider Routing 패턴

### 구조

```
infrastructure/{domain}/
  {Domain}Client.java                  ← 인터페이스 (Port)
  Routing{Domain}Client.java           ← @Primary — ConfigStore 기반 라우터
  noop/
    NoOp{Domain}Client.java            ← 항상 등록, no-op 구현 / @Component("noop")
  {provider}/
    {Provider}{Domain}Client.java      ← 항상 등록 / @Component("{provider}")
```

### Routing 빈 동작 원리

```
요청
 │
 ▼
Routing{Domain}Client  (@Primary)
 │  configStore.get(GENERAL, "{domain}.provider", "none")
 │
 ├─ "none"     → NoOp{Domain}Client
 ├─ "zitadel"  → Zitadel{Domain}Client
 └─ "lago"     → Lago{Domain}Client
```

- **서비스 코드는 인터페이스만 의존** — 어떤 구현체가 뒤에 있는지 알 필요 없다.
- **Routing 빈이 router이자 wrapper** — 서비스 전역에 호출 코드가 산재해도 단일 진입점이 보장된다.
- **ConfigStore에서 매 호출마다 provider를 읽음** — DB 수정 + 앱 재시작만으로 전환 완료.

### Routing 빈 구현 템플릿

```java
@Primary
@Component
@RequiredArgsConstructor
public class RoutingFooClient implements FooClient {

    private final ConfigStore configStore;

    // Spring이 FooClient 구현체 전체를 Map<beanName, impl>으로 주입
    // key = @Component("...") 값 → provider 이름과 1:1 매핑
    @Autowired
    private Map<String, FooClient> providers;

    @PostConstruct
    private void removeSelf() {
        providers.remove("routingFooClient"); // 자기 자신 제거
    }

    @Override
    public void someMethod() {
        resolve().someMethod();
    }

    private FooClient resolve() {
        String provider = configStore.get(ConfigCategory.GENERAL, "foo.provider", "none");
        FooClient client = providers.get(provider);
        if (client == null) {
            log.warn("Unknown foo provider '{}', falling back to 'none'", provider);
            return providers.get("none");
        }
        return client;
    }
}
```

---

## 현재 지원 도메인

### IAM (Identity & Access Management)

**Provider 키**: `GENERAL / iam.provider`

| 값 | 구현체 | 설명 |
|----|--------|------|
| `none` | `NoOpIamClient` | 모든 IAM 호출 무시 (개발/데모) |
| `zitadel` | `ZitadelClient` | Zitadel Management API 연동 |

**Zitadel 연결 설정** (`IAM` 카테고리):

| 키 | 설명 | 민감값 |
|----|------|--------|
| `zitadel.issuer-uri` | Zitadel 발급 URL | N |
| `zitadel.client-id` | OAuth2 Client ID | N |
| `zitadel.client-secret` | OAuth2 Client Secret | **Y** |
| `zitadel.domain` | Zitadel 도메인 | N |
| `zitadel.org-id` | 조직 ID | N |
| `zitadel.project-id` | 프로젝트 ID | N |
| `zitadel.api-token` | Management API 토큰 | **Y** |

### K8s / Provisioning

**Provider 키**: `GENERAL / k8s.provider`

| 값 | 구현체 | 설명 |
|----|--------|------|
| `none` | `NoOpProvisioningClient` | 프로비저닝 무시 |
| `flux` | `TofuControllerProvisioningClient` | FluxCD + tofu-controller |

> K8s는 `KubernetesClient` 빈 자체가 실제 클러스터 연결을 요구하므로
> `@ConditionalOnProperty(app.k8s.enabled=true)` 조건을 별도 유지한다.

---

## 새 Provider 추가 방법

### 1. 구현체 작성

```java
// @Component 값이 ConfigStore의 provider 값과 일치해야 한다
@Component("lago")
@RequiredArgsConstructor
public class LagoBillingClient implements BillingClient {

    private final ConfigStore configStore;

    @Override
    public void createSubscription(String userId, String planId) {
        String apiKey = configStore.get(ConfigCategory.BILLING, "lago.api-key", "");
        String baseUrl = configStore.get(ConfigCategory.BILLING, "lago.base-url", "");
        // Lago API 호출 ...
    }
}
```

> `@Value`를 쓰지 않고 `ConfigStore.get()`을 호출 시점에 사용하면
> DB 값이 변경됐을 때 앱 재시작 없이 즉시 반영된다.

### 2. DefaultConfigSeeder에 기본값 추가

```java
// DefaultConfigSeeder.java
seedIfAbsent(existingBillingKeys, ConfigCategory.BILLING, "lago.api-key", "", true,
        "Lago API 키");
seedIfAbsent(existingBillingKeys, ConfigCategory.BILLING, "lago.base-url", "", false,
        "Lago 서버 URL");
```

### 3. Routing 빈에 자동 등록 확인

`Map<String, BillingClient>` 주입을 사용하는 `RoutingBillingClient`는 별도 수정 없이
새 구현체를 자동으로 인식한다.

### 4. UI에서 설정

```
GENERAL / billing.provider = lago
BILLING / lago.api-key     = sk-...
BILLING / lago.base-url    = https://api.lago.com
```

---

## 도메인별 패턴 선택 기준

| 조건 | 패턴 |
|------|------|
| 외부 의존성 없음 (순수 API 클라이언트) | Routing 패턴 — 모든 구현체 항상 등록 |
| 외부 빈 필요 (KubernetesClient 등) | `@ConditionalOnProperty` 유지 + Routing 빈 추가 가능 |
| 단일 구현체 (변경 없음) | 인터페이스만 정의, 조건부 불필요 |

---

## 디렉토리 구조 (확장 예시)

```
infrastructure/
  iam/
    IamClient.java
    IamTokenDecoder.java
    RoutingIamClient.java           ← @Primary
    RoutingIamTokenDecoder.java     ← @Primary
    noop/
      NoOpIamClient.java            ← @Component("noop")
      NoOpIamTokenDecoder.java      ← @Component("noop")
    zitadel/
      ZitadelClient.java            ← @Component("zitadel")
      ZitadelTokenDecoder.java      ← @Component("zitadel")
      ZitadelIamConfig.java
      client/
        ZitadelAuthExecutor.java
        ZitadelUserExecutor.java

  billing/                          ← 추후 추가
    BillingClient.java
    RoutingBillingClient.java       ← @Primary
    noop/NoOpBillingClient.java     ← @Component("noop")
    lago/LagoBillingClient.java     ← @Component("lago")

  k8s/
    ProvisioningClient.java
    noop/NoOpProvisioningClient.java
    flux/TofuControllerProvisioningClient.java

  config/
    ConfigStore.java
    DbEnvConfigStore.java
    DefaultConfigSeeder.java
    EncryptedStringConverter.java
```
