# 사용자 관리 기능 구현 가이드

## 개요

관리자 페이지(`/admin`)에서 Zitadel에 등록된 사용자 목록을 조회하고 관리할 수 있는 기능을 구현했습니다.

## 주요 기능

✅ **이중 인증 지원**
- Service Account 방식 (우선)
- 사용자 Access Token 방식 (fallback)

✅ **권한 기반 접근 제어**
- Admin 역할이 있는 사용자만 접근 가능
- 권한 없는 사용자는 자동으로 홈으로 리디렉션

✅ **사용자 정보 표시**
- 이름, 이메일, 사용자명
- 계정 상태 (활성/비활성/잠김)
- 이메일 인증 여부
- 생성일

## 구현 파일

### 1. Zitadel API 클라이언트

**[src/lib/zitadel-client.ts](file:///Users/hwan/github/h001-lab/OpenCSP-console/fe/src/lib/zitadel-client.ts)**

이중 인증을 지원하는 Zitadel Management API 클라이언트:

```typescript
export class ZitadelClient {
  // Service Account JWT 생성
  private async createServiceAccountJWT(): Promise<string>
  
  // Service Account로 Access Token 획득
  private async getServiceAccountToken(): Promise<string>
  
  // Access Token 획득 (Service Account 우선, user token fallback)
  async getAccessToken(userToken?: string): Promise<string>
  
  // 사용자 목록 조회
  async listUsers(accessToken: string, limit = 100)
  
  // 사용자 권한 조회
  async getUserGrants(accessToken: string, userId: string)
}
```

**인증 우선순위:**
1. Service Account 설정이 있으면 Service Account 사용
2. Service Account 실패 또는 미설정 시 사용자 Access Token 사용

### 2. API 라우트

**[src/app/api/admin/users/route.ts](file:///Users/hwan/github/h001-lab/OpenCSP-console/fe/src/app/api/admin/users/route.ts)**

사용자 목록 조회 API:

```typescript
export async function GET() {
  // 1. 세션 확인
  const session = await auth();
  
  // 2. Admin 권한 확인
  const roles = (session.user as any)?.roles || [];
  if (!roles.includes('admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // 3. Access Token 획득 (dual auth)
  const accessToken = await zitadelClient.getAccessToken(userToken);
  
  // 4. 사용자 목록 조회
  const data = await zitadelClient.listUsers(accessToken);
  
  return NextResponse.json(data);
}
```

### 3. 관리자 페이지

**[src/app/[locale]/admin/page.tsx](file:///Users/hwan/github/h001-lab/OpenCSP-console/fe/src/app/%5Blocale%5D/admin/page.tsx)**

사용자 목록을 표시하는 관리자 페이지:

**주요 기능:**
- 권한 확인 및 자동 리디렉션
- 사용자 목록 테이블
- 로딩 상태 표시
- 에러 처리 및 재시도
- 새로고침 기능

### 4. 타입 정의

**[src/types/admin.ts](file:///Users/hwan/github/h001-lab/OpenCSP-console/fe/src/types/admin.ts)**

```typescript
export interface ZitadelUser {
  userId: string;
  userName: string;
  preferredLoginName: string;
  human?: {
    profile: {
      firstName: string;
      lastName: string;
      displayName: string;
    };
    email: {
      email: string;
      isEmailVerified: boolean;
    };
  };
  state: 'USER_STATE_ACTIVE' | 'USER_STATE_INACTIVE' | 'USER_STATE_DELETED' | 'USER_STATE_LOCKED';
}
```

## 환경 변수 설정

### 기본 설정 (사용자 Token 사용)

`.env` 파일에 기본 Zitadel 설정만 있으면 사용자의 Access Token을 사용합니다:

```env
ZITADEL_ISSUER=https://idp.avgmax.team
ZITADEL_CLIENT_ID=your-client-id
```

### Service Account 설정 (권장)

더 안정적인 API 호출을 위해 Service Account를 설정할 수 있습니다:

```env
# Service Account 설정
ZITADEL_SERVICE_USER_ID=123456789012345678
ZITADEL_SERVICE_KEY_ID=987654321098765432
ZITADEL_SERVICE_KEY=LS0tLS1CRUdJTi...base64-encoded-key...
```

**Service Account 생성 방법:**

1. Zitadel 콘솔 접속
2. Organization → Service Users → New
3. Service User 생성 후 Key 생성
4. Key를 다운로드하여 JSON 파일 확인:
   ```json
   {
     "type": "serviceaccount",
     "keyId": "...",
     "key": "...",
     "userId": "..."
   }
   ```
5. 각 값을 환경 변수에 설정
6. Service User에 필요한 권한 부여:
   - `user.read`
   - `authorization.read`

## 사용 방법

### 1. Admin 페이지 접근

```
http://localhost:3000/admin
```

- Admin 역할이 있는 사용자만 접근 가능
- 권한 없는 사용자는 자동으로 홈으로 리디렉션

### 2. 사용자 목록 확인

페이지에서 다음 정보를 확인할 수 있습니다:

- **사용자 정보**: 이름, 프로필 이미지 (이니셜)
- **이메일**: 이메일 주소 및 인증 상태
- **사용자명**: 로그인 ID
- **상태**: 활성/비활성/잠김/삭제됨
- **생성일**: 계정 생성 날짜

### 3. 새로고침

"새로고침" 버튼을 클릭하여 최신 사용자 목록을 다시 불러올 수 있습니다.

## API 응답 예시

### 성공 응답

```json
{
  "result": [
    {
      "userId": "123456789",
      "userName": "john_doe",
      "preferredLoginName": "john@example.com",
      "human": {
        "profile": {
          "firstName": "John",
          "lastName": "Doe",
          "displayName": "John Doe"
        },
        "email": {
          "email": "john@example.com",
          "isEmailVerified": true
        }
      },
      "state": "USER_STATE_ACTIVE",
      "creationDate": "2024-01-15T10:30:00Z"
    }
  ],
  "details": {
    "totalResult": "1",
    "processedSequence": "12345",
    "viewTimestamp": "2024-02-11T04:30:00Z"
  }
}
```

### 에러 응답

```json
{
  "error": "Forbidden - Admin access required"
}
```

## 보안 고려사항

> [!WARNING]
> **API 권한 관리**
> 
> - Service Account에는 필요한 최소 권한만 부여하세요
> - Service Account Key는 절대 공개 저장소에 커밋하지 마세요
> - `.env` 파일은 `.gitignore`에 포함되어 있는지 확인하세요

> [!IMPORTANT]
> **클라이언트 측 보호의 한계**
> 
> 현재 구현은 클라이언트 측에서 admin 역할을 확인하고 리디렉션합니다.
> 서버 측 API 라우트에서도 권한을 확인하므로 안전하지만,
> 추가적인 보안을 위해 Next.js 미들웨어를 사용할 수 있습니다.

## 트러블슈팅

### 1. "Unauthorized" 에러

**원인**: 로그인하지 않았거나 세션이 만료됨

**해결**: 다시 로그인

### 2. "Forbidden - Admin access required" 에러

**원인**: Admin 역할이 없음

**해결**: Zitadel에서 사용자에게 admin 역할 부여

### 3. "Failed to fetch users" 에러

**원인**: 
- Zitadel Management API 접근 권한 부족
- Service Account 설정 오류
- 네트워크 문제

**해결**:
1. Zitadel에서 사용자 또는 Service Account에 `user.read` 권한 부여
2. Service Account 환경 변수 확인
3. Zitadel 서버 연결 확인

### 4. Service Account JWT 생성 실패

**원인**: 잘못된 Private Key 형식

**해결**:
1. Zitadel에서 다운로드한 JSON 파일 확인
2. `key` 필드의 값을 그대로 복사 (Base64 인코딩된 상태)
3. 환경 변수에 정확히 설정

## 향후 개선 사항

- [ ] 사용자 검색 기능
- [ ] 사용자 역할 편집 기능
- [ ] 페이지네이션
- [ ] 사용자 상세 정보 모달
- [ ] 사용자 생성/삭제 기능
- [ ] 역할 필터링

## 참고 자료

- [Zitadel Management API 문서](https://zitadel.com/docs/apis/resources/mgmt)
- [Zitadel Service Account 가이드](https://zitadel.com/docs/guides/integrate/service-users)
- [NextAuth.js 문서](https://next-auth.js.org/)
