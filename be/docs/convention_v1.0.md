***

# Backend Coding Convention (Draft)

본 문서는 Java + Spring Boot 기반 백엔드 개발을 위한 공통 컨벤션 초안이다.
JPA, Querydsl, PostgreSQL 사용을 기본 가정하되, 최대한 DB 벤더 및 인프라에 독립적인 원칙을 지향한다.

***

## 1. 공통 원칙

- 가독성과 일관성을 최우선으로 한다. “팀이 이해하기 쉬운 코드”를 목표로 한다.
- 동일한 문제에 대해 항상 같은 방식으로 해결한다(중복된 논쟁 방지).
- 컨벤션은 절대 규칙이 아니라 기본값이며, 명확한 이유가 있으면 예외를 허용하되 PR에서 근거를 남긴다.

***

## 2. 프로젝트 구조

### 2.1 패키지 구조

- 기본 패키지 예시: `com.company.project` -> 현재 프로젝트는 `io.hlab.OpenConsole`
- 도메인 중심 구조를 우선 고려한다.

예시:

- `com.company.project.api` (입출력, 컨트롤러, DTO) -> 외부와의 경계, HTTP/메시지 큐 등
- `com.company.project.application` (유스케이스, 서비스) -> 사용자가 시스템에 요청하는 동작(usecase)를 순서대로 실행하는 레이어
- `com.company.project.domain` (엔티티, 도메인 서비스, 리포지토리 인터페이스) -> 비즈니스 규칙 그 자체.
- `com.company.project.infrastructure` (JPA 구현체, 외부 시스템 연동, 설정) -> DB, Redis, 외부 API 등 기술적 구현
- `com.company.project.common` (공통 유틸, 예외, 공통 응답 등)

필요 시 도메인 단위로 하위 패키지 분리:

- `…domain.user`, `…domain.order`  
- `…api.user`, `…api.order` 등

### 2.1.1 기능별 독립 패키지 구조 (Feature-based Package Structure)

여러 기능이 독립적으로 관리되어야 하거나, 기능별로 완전히 분리된 모듈로 구성하고 싶을 때는 기능 단위로 상위 패키지를 구성할 수 있다.

**구조 예시:**

```
io.hlab.OpenConsole.example/
├── order/                        # 주문 기능
│   ├── api/                      # ① External Interface
│   │   ├── dto/
│   │   │   ├── OrderRequestDTO.java
│   │   │   └── OrderResponseDTO.java
│   │   ├── OrderController.java
│   │   └── OrderApiMapper.java
│   ├── application/              # ② User Sequence
│   │   └── OrderService.java
│   ├── domain/                    # ③ Core Business Logic
│   │   ├── Order.java
│   │   ├── OrderStatus.java
│   │   ├── OrderRepository.java
│   │   └── DiscountService.java
│   └── infrastructure/           # ④ Technical Implementation
│       ├── JpaOrderRepository.java
│       ├── SpringDataOrderRepository.java
│       └── KakaoPaymentClient.java
│
└── reservation/                   # 예약 기능
    ├── api/
    │   ├── dto/
    │   ├── ReservationController.java
    ├── application/
    │   └── ReservationService.java
    ├── domain/
    │   ├── Reservation.java
    │   ├── ReservationStatus.java
    │   └── ReservationRepository.java
    └── infrastructure/
        ├── JpaReservationRepository.java
        └── SpringDataReservationRepository.java
```

**이 구조의 특징:**

1. **기능별 독립성**: 각 기능(`order`, `reservation`)이 독립적인 레이어 구조를 가진다.
2. **일관된 레이어 구조**: 모든 기능이 동일한 레이어 구조(`api`, `application`, `domain`, `infrastructure`)를 따른다.
3. **명확한 책임 분리**: 각 레이어의 역할이 명확히 구분된다.
4. **확장성**: 새로운 기능 추가 시 동일한 패턴을 따르면 된다.

**사용 시기:**

- 여러 독립적인 비즈니스 기능이 존재할 때
- 기능별로 완전히 분리된 모듈로 관리하고 싶을 때
- 각 기능이 독립적으로 테스트되고 배포되어야 할 때
- 예시 코드나 학습용 구조를 만들 때

**레이어별 역할:**

- **api (External Interface)**: 외부 시스템(브라우저, 모바일 앱)과 가장 먼저 만나는 접점
  - `Controller`: HTTP 요청을 받고 응답을 반환
  - `DTO`: 화면에서 보내는 데이터 양식과 클라이언트에게 보여줄 데이터 양식
  - `ApiMapper` (선택): DTO를 내부에서 쓰는 객체로 변환하거나 그 반대 역할

- **application (User Sequence)**: 사용자가 요청한 "시나리오"를 순서대로 실행 (데이터의 흐름 제어)
  - `Service` (또는 `UseCase`): 리포지토리에서 정보 조회 → 도메인 모델 생성 → 도메인 서비스 호출 → 리포지토리에 저장 → 이벤트 발행 등

- **domain (Core Business Logic)**: 가장 중요한 비즈니스 규칙이 모여 있는 곳 (기술에 의존하지 않는 순수 자바 코드 중심)
  - `Entity`: 상태를 가지고 있고, 핵심 로직을 직접 수행 (`cancel()`, `calculateTotal()` 등)
  - `Value Object`: 값 객체 (예: `OrderStatus` Enum)
  - `Repository` (인터페이스): "저장/조회한다"는 추상적인 약속
  - `Domain Service`: 여러 엔티티가 협력해야 하거나 엔티티에 넣기 비대한 로직을 처리

- **infrastructure (Technical Implementation)**: 도메인과 애플리케이션 계층에서 선언한 약속들을 실제로 구현하는 기술적인 영역
  - `JpaRepository`: domain에 있는 Repository 인터페이스를 실제로 JPA를 사용하여 구현
  - `ExternalClient`: 외부 API와의 실제 통신 로직 (예: `KakaoPaymentClient`)
  - `EventPublisher`: 메시지 큐에 이벤트를 발행하는 실제 기술 구현체

### 2.2 레이어 역할

- **Controller (api)**: HTTP 요청/응답 변환, 검증(@Valid), 인증/인가 처리 위임.
- **Application/Service**: 유스케이스 구현, 트랜잭션 경계, 도메인 서비스 호출.
- **Domain**: 엔티티, 값 객체, 도메인 규칙, 도메인 서비스.
- **Infrastructure**: DB, 메시징, 외부 API 연동 구현체, 설정.

비즈니스 로직은 Controller에 두지 않고 Service/Domain에 둔다.

- 도메인 서비스란, 하나의 엔티티에 귀속되지 않고, 여러 엔티티 간의 도메인 규칙을 처리하는 순수한 비즈니스 로직을 담당하는 클래스이다. 엔티티에 넣기 애매하거나 크기가 비대한 로직을 분리해서 넣는 용도이다.
예시)
``` java
// ❌ Order 엔티티에 넣으면 Order가 너무 많은 책임
class Order {
    // 쿠폰, 멤버십, 프로모션 등 다 알아야 함 → 비대해짐
}

// ✅ Domain Service로 분리
@Service  // @Service지만 도메인 서비스 (Spring Service 아님)
public class DiscountService {
    public Money calculateDiscount(Order order, Coupon coupon, Membership membership) {
        Money couponDiscount = coupon.calculateDiscount(order.getTotalAmount());
        Money membershipDiscount = membership.calculateDiscount(order.getUser());
        return Money.sum(couponDiscount, membershipDiscount);
    }
}

```


***

## 3. 네이밍 규칙

### 3.1 클래스/인터페이스

- Controller: `UserController`, `OrderController`  
- Service: `UserService`, `UserFacade` (필요 시), 인터페이스는 `UserService`, 구현체는 `UserServiceImpl` 또는 `UserServiceImpl` 대신 도메인 의미 있는 이름 사용.  
- DTO:  
  - 요청: `UserCreateRequest`, `UserUpdateRequest`  
  - 응답: `UserResponse`, `UserDetailResponse`  
- Entity: 단수형 도메인 이름 사용 (`User`, `OrderItem`).  
- Repository:  
  - 도메인 기반: `UserRepository`, `OrderRepository`  
  - Querydsl 확장: `UserQueryRepository`, `UserRepositoryCustom`  

### 3.2 메서드/변수

- 메서드: 소문자 시작, 동사 + 목적어 (`createUser`, `updateOrderStatus`).  
- boolean: `isActive`, `hasPermission`, `existsByEmail` 등.  
- 변수: 의미 있는 이름 사용, 약어 지양 (`u`, `obj` 등 금지).  

***

## 4. Java 코드 스타일

- 코드 포맷:
  - 들여쓰기: 4 spaces  
  - 최대 줄 길이: 120  
  - `import` 정리: 사용하지 않는 import 제거, `*` import 사용 금지.
- 기본 스타일은 Google Java Style 기반으로 통일하고, IDE에 설정은 커밋하지 않는다.
- `Optional`은 반환 타입에서만 사용하고, 필드나 파라미터에는 사용하지 않는다.
- Lombok 사용 여부와 범위를 정의 (예: `@Getter`, `@RequiredArgsConstructor`만 허용 등).

정적 분석/포맷팅 도구:

- Checkstyle / Spotless / EditorConfig 등을 도입해 CI에서 포맷 및 규칙을 자동 검증한다.

**(이건 추후 수정!)**

***

## 5. Spring & REST API 컨벤션

### 5.1 컨트롤러

- `@RestController` + `@RequestMapping("/users")` 등으로 리소스 단위로 그룹화.  
- 메서드 예시:
  - `GET /users/{id}` → `getUser(@PathVariable Long id)`
  - `POST /users` → `createUser(@RequestBody @Valid UserCreateRequest request)`
  - `PUT/PATCH /users/{id}` → `updateUser`
  - `DELETE /users/{id}` → `deleteUser`

### 5.2 URL·HTTP 메서드

- URL은 복수형 리소스 명 사용: `/users`, `/orders`.
- 행위는 HTTP 메서드로 표현하고, URL에 동사 사용은 최소화.
- 서브 리소스 예: `/users/{userId}/orders`

### 5.3 공통 응답/에러 포맷

- 공통 응답 포맷 예:

```json
{
  "code": "SUCCESS",
  "message": "성공",
  "data": { ... }
}
```

- 에러 응답 예:

```json
{
  "code": "USER_NOT_FOUND",
  "message": "사용자를 찾을 수 없습니다.",
  "status": 404
}
```

- `@ControllerAdvice` + `@ExceptionHandler`로 전역 예외 처리.  
- HTTP status와 비즈니스 에러 코드는 명시적으로 매핑 테이블을 정한다.

### 5.4 REST API 설계 원칙 (HATEOAS 개념)
REST API의 원래 설계 의도인 HATEOAS (Hypermedia as the Engine of Application State) 개념을 적용하여 프런트엔드의 종속성을 최소화하고 확장성을 높이는 것을 목표로 한다. 이 원칙은 프런트엔드가 API 문서 없이도 개발을 할 수 있게 하는 REST API의 진정한 정신이다.
1. URL 객체 사용 및 하드코딩 지양:
    ◦ 프런트엔드가 URL을 직접 하드코딩하여 호출하는 대신, 백엔드에서 반환하는 URL이 포함된 객체를 사용해야 한다.
    ◦ 프런트엔드는 API 시작점만 알고, 요청 시 응답으로 링크가 담긴 리스트를 받으면, 그 객체에서 링크 필드만 가져와서 사용한다.
    ◦ 이 방식을 통해 백엔드에서 API 주소를 아무리 바꾸더라도 프런트엔드는 전혀 영향을 받지 않아 파일 변경, 재빌드/재배포 등의 문제를 방지할 수 있다.

2. 실용적인 적용 범위:
    ◦ HATEOAS의 구현은 백엔드에서 많은 작업이 필요하고, 프런트엔드에서도 매번 링크의 존재 여부를 확인해야 하는 등 복잡성 때문에 한국 시장의 '빨리빨리' 개발 문화에서는 잘 쓰이지 않는 경향이 있다.
    ◦ 이 원칙은 공용(Public) API를 만들거나, 프런트엔드와 백엔드의 관심사를 정확히 분리하여 확장성이 좋은 프로그램을 만들고자 할 때 채택하는 것을 권장한다.
    ◦ 내부 시스템에서만 쓰이는 API를 개발하는 경우에는 굳이 이 복잡한 방식을 적용할 필요가 없을 수 있으며, 이 경우 기존의 문서 위주 REST API(HTTP API) 방식으로 진행할 수 있다.


***

## 6. JPA & DB 컨벤션

### 6.1 엔티티 설계

- 모든 엔티티는 식별자 필드 `id` 사용 (예: `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)` 등).  
- 날짜/시간은 `LocalDateTime` 사용, 타임존 처리는 인프라 계층에서 관리.  
- `@Enumerated(EnumType.STRING)` 기본 사용.  
- 연관관계는 기본 `LAZY`, 필요 시 fetch join/EntityGraph로 튜닝.  
- 양방향 연관관계는 꼭 필요할 때만 사용, 단방향을 우선.  

### 6.2 트랜잭션

- Service 레이어에서만 `@Transactional` 사용을 원칙으로 한다.  
- 읽기 전용 메서드는 `@Transactional(readOnly = true)`.  
- 도메인 이벤트, 비동기 처리 등은 트랜잭션 경계를 명확히 문서화한다.

### 6.3 DB Naming

- 테이블 이름: snake_case, 복수형 또는 팀 합의된 규칙 (예: `users`, `order_items`).  
- 컬럼 이름: snake_case (`user_id`, `created_at`).  
- FK: `<참조테이블단수>_id` (예: `user_id`, `order_id`).  

마이그레이션:

- Flyway 혹은 Liquibase 등 하나를 선택해, SQL/DDL은 반드시 이 도구를 통해 적용한다.  
- 스크립트 네이밍 예: `V1__init_user_table.sql`, `V2__add_order_table.sql`.

***

## 7. Querydsl 컨벤션

- 복잡한 조회/동적 검색은 Querydsl 전용 레포지토리나 구현체로 분리한다.  

예시 구조:

- `UserRepository` (Spring Data JPA 인터페이스)  
- `UserRepositoryCustom` (커스텀 인터페이스)  
- `UserRepositoryImpl` (Querydsl 구현체, `JPAQueryFactory` 사용)  

- 반환 타입:
  - 목록 조회: `List<Dto>`, 페이징: `Page<Dto>` 혹은 `Slice<Dto>`.  
  - 엔티티 직접 반환보다는 가급적 DTO 반환을 우선 고려.  

- BooleanBuilder/동적 조건 로직은 private 메서드로 분리해 재사용성과 가독성을 높인다.

***

## 8. PostgreSQL 및 DB 벤더 독립성

- JPA 레벨 코드는 특정 DB 벤더 기능에 종속되지 않도록 작성한다.  
- PostgreSQL 고유 기능(JSONB, 특정 함수 등)은 `infrastructure` 레이어에 캡슐화하고, 도메인·서비스 레이어에는 노출하지 않는다.  
- 테스트 DB(H2 등)와 운영 DB(PostgreSQL)를 교체할 수 있도록, 설정은 `application-*.yml` 프로파일로 분리한다.  

***

## 9. 테스트 컨벤션

- 테스트 클래스 네이밍: `UserServiceTest`, `UserControllerTest`.  
- 메서드 네이밍: `methodName_condition_expectedResult` 형식 권장.  
- Spring 테스트:
  - Web 레이어: `@WebMvcTest`  
  - JPA 레이어: `@DataJpaTest`  
  - 통합 테스트: `@SpringBootTest`  

외부 의존성은 가급적 Mock/Stub 사용, 통합 테스트는 핵심 플로우 위주로 한정한다.

***

## 10. 로그 & 기타

- 로거 선언: Lombok `@Slf4j` 또는 `private static final Logger log = LoggerFactory.getLogger(...);`.  
- 비밀번호, 토큰, 개인정보는 절대 로그로 남기지 않는다.  
- 로그 레벨:
  - INFO: 주요 비즈니스 플로우  
  - WARN: 예측 가능하지만 주의가 필요한 상황  
  - ERROR: 실제 장애, 예외 상황  

- 커밋 메시지 규칙(예: Conventional Commits):

  - `feat:`, `fix:`, `refactor:`, `docs:` 등 prefix 사용.  
  - 한글/영문은 팀 합의에 따르되, 일관성을 유지한다.  

***

### 부록: 인프라 & 운영 컨벤션 (별도 문서)

Proxmox, Teleport, VPC 설계, 배포 파이프라인 등은 별도 `INFRA_CONVENTION.md`로 관리한다.  
애플리케이션 컨벤션 문서에서는 인프라 문서를 링크만 한다.

***
