# .env.local 파일 생성 가이드

이 파일을 `.env.local`로 복사하고 실제 값으로 업데이트하세요.

```bash
cp .env.example .env.local
```

## 필수 설정

### 1. ZITADEL_CLIENT_ID
Zitadel 콘솔에서 생성한 애플리케이션의 Client ID를 입력하세요.

### 2. NEXTAUTH_SECRET
아래 명령어로 생성된 랜덤 시크릿을 사용하세요:
```bash
openssl rand -base64 32
```

생성된 값: `hrnGw6QYV6ysIXIQ2gw9MkQtDqYga1LT6y7ZWMd8oT8=`

## .env.local 예시

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Zitadel OIDC Configuration
ZITADEL_ISSUER=https://idp.avgamx.team
ZITADEL_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID_HERE

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=hrnGw6QYV6ysIXIQ2gw9MkQtDqYga1LT6y7ZWMd8oT8=
```

## Zitadel 애플리케이션 설정 확인사항

1. **Redirect URIs**에 다음이 포함되어 있는지 확인:
   - `http://localhost:3000/api/auth/callback/zitadel`

2. **Post Logout Redirect URIs**에 다음이 포함되어 있는지 확인:
   - `http://localhost:3000`

3. **Authentication Method**: PKCE

4. **Token Settings** (권장):
   - Refresh Token 활성화
   - User roles inside ID Token 활성화
   - User Info inside ID Token 활성화
