# Phase 6: Email to Subject 조회 Troubleshooting

## 작업 개요

Phase 6에서 `getUserSubjectByEmail()` 메서드 구현 중 Zitadel Management API를 통한 사용자 조회가 계속 실패하는 문제를 해결하기 위한 과정입니다.

## 작업 목표

- Email 주소로 Zitadel 사용자의 `subject` (user ID)를 조회하는 기능 구현
- Role 관리 API (`POST /roles`, `DELETE /roles`)에서 email을 받아 내부적으로 subject로 변환

## 진행 과정

### 1. 초기 구현 시도

**시도한 방법들:**
1. `GET /management/v1/users/_by_email?email={email}` - 404 에러
2. `GET /management/v1/users/_by_email?email={email}&orgId={orgId}` - 404 에러
3. `GET /management/v1/users/_search?query=email:{email}` - 404 에러
4. `GET /management/v1/users/_search?query=email:{email}&orgId={orgId}` - 404 에러
5. `GET /management/v1/users` (목록 조회 후 필터링) - 404 에러

**추가한 헤더:**
- `x-zitadel-orgid: {orgId}` - 헤더로 orgId 전송 시도
- `Content-Type: application/json`

**추가한 쿼리 파라미터:**
- `orgId={orgId}`
- `projectId={projectId}`

### 2. 에러 응답 분석

**에러 메시지:**
```json
{
  "code": 5,
  "message": "User could not be found (QUERY-Dfbg2)",
  "details": [{
    "@type": "type.googleapis.com/zitadel.v1.ErrorDetail",
    "id": "QUERY-Dfbg2",
    "message": "User could not be found"
  }]
}
```

**확인된 사실:**
- 사용자는 Zitadel에 존재함 (콘솔에서 확인)
- orgId도 일치함 (org가 1개)
- API 토큰 권한은 있음 (다른 API 호출은 성공)

### 3. 시도한 해결 방법들

#### 3.1. orgId 헤더 추가
```java
.defaultHeader("x-zitadel-orgid", orgId)
```
**결과**: 여전히 404 에러

#### 3.2. 쿼리 파라미터로 orgId 전송
```java
.queryParam("orgId", orgId)
.queryParam("projectId", projectId)
```
**결과**: 여전히 404 에러

#### 3.3. POST 방식 _search 시도
```java
POST /management/v1/users/_search
{
  "query": {
    "offset": "0",
    "limit": 100,
    "asc": true
  },
  "queries": [{
    "email_query": {
      "email": "{email}",
      "method": "TEXT_QUERY_METHOD_CONTAINS"
    }
  }]
}
```
**결과**: 구현했으나 테스트 전에 작업 중단

#### 3.4. 사용자 목록 조회 후 필터링
```java
GET /management/v1/users?limit=100
```
**결과**: 404 에러

### 4. 현재 상태

**구현된 코드:**
- `GET /management/v1/users/_search?query=email:{email}` 시도
- `GET /management/v1/users?limit=100` 시도 후 이메일로 필터링
- 동적 응답 파싱 (리스트 또는 단일 객체 처리)

**문제점:**
- 모든 엔드포인트에서 404 에러 발생
- Zitadel Management API 문서의 정확한 스펙 확인 필요

## 사용자 개입 포인트

### 1. orgId 헤더 추가 제안
사용자가 orgId 헤더를 추가하는 것을 제안했으나, 이미 시도했던 방법이었음.

### 2. projectId 추가 제안
사용자가 projectId가 필요할 수도 있다고 제안하여 쿼리 파라미터에 추가 시도.

### 3. Zitadel Management API 문서 확인 요청
사용자가 직접 문서를 확인하라고 요청. 현재 문서 확인이 필요한 상태.

## 남은 작업

### 즉시 해결 필요
1. **Zitadel Management API 문서 확인**
   - 실제 사용자 조회 엔드포인트 확인
   - 요청 파라미터 형식 확인
   - orgId/projectId 전달 방식 확인

2. **대안 방법 검토**
   - JWT에서 subject를 직접 사용하는 방법
   - Role 관리 API에서 email 대신 subject를 받는 방법
   - Zitadel 콘솔에서 subject를 확인하여 직접 입력하는 방법

### 향후 개선 사항
1. **에러 처리 개선**
   - 404 에러에 대한 더 명확한 메시지
   - 재시도 로직 추가 (필요시)

2. **로깅 개선**
   - 실제 요청 URL 상세 로깅
   - 응답 본문 전체 로깅 (디버그 모드)

3. **테스트 코드 작성**
   - Mock을 사용한 단위 테스트
   - 실제 Zitadel과의 통합 테스트

## 참고 자료

- Zitadel Management API 문서: https://zitadel.com/docs/apis/resources/mgmt/management-api
- 현재 구현 파일: `be/src/main/java/io/hlab/OpenConsole/infrastructure/iam/zitadel/ZitadelClient.java`
- 관련 이슈: `getUserSubjectByEmail()` 메서드 (라인 166-300)

## 결론

현재 `getUserSubjectByEmail()` 메서드는 구현되어 있으나, Zitadel Management API의 실제 스펙과 일치하지 않아 404 에러가 발생하고 있습니다. Zitadel 공식 문서를 확인하여 정확한 엔드포인트와 파라미터 형식을 확인한 후 수정이 필요합니다.

