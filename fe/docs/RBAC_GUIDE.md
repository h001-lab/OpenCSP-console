# 역할 기반 접근 제어 (RBAC) 구현 가이드

## 개요

Zitadel 역할을 사용한 역할 기반 접근 제어를 구현했습니다. 역할은 Zustand 스토어에 저장되며, 사용자가 `admin` 역할을 가지고 있을 때만 관리자 네비게이션 링크가 표시됩니다.

## 구현 세부사항

### 1. Auth Store 업데이트

**[src/stores/authStore.ts](file:///Users/hwan/github/h001-lab/OpenCSP-console/fe/src/stores/authStore.ts)**

역할 확인을 위한 헬퍼 메서드 추가:

```typescript
interface AuthActions {
  // ... 기존 액션들
  hasRole: (role: string) => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // ... 기존 상태와 액션들
  
  hasRole: (role: string) => {
    const state = get();
    return state.user?.roles?.includes(role) ?? false;
  },

  isAdmin: () => {
    const state = get();
    return state.user?.roles?.includes('admin') ?? false;
  },
}));
```

### 2. NextAuth 설정

**[src/lib/auth.ts](file:///Users/hwan/github/h001-lab/OpenCSP-console/fe/src/lib/auth.ts)**

Zitadel 프로필에서 역할을 추출하도록 업데이트:

```typescript
// 인증 스코프에 프로젝트 스코프 추가
scope: "openid email profile urn:zitadel:iam:org:project:id:zitadel:aud"

// JWT 콜백에서 프로필로부터 역할 추출
async jwt({ token, account, profile }) {
  if (account && profile) {
    // Zitadel은 'urn:zitadel:iam:org:project:roles' claim에 역할을 저장
    const roles = (profile as any)['urn:zitadel:iam:org:project:roles'] || 
                  (profile as any).roles || 
                  [];
    
    return {
      ...token,
      roles: Object.keys(roles).length > 0 ? Object.keys(roles) : [],
      // ... 기타 필드들
    };
  }
}

// 세션 콜백에 역할 포함
async session({ session, token }) {
  return {
    ...session,
    user: {
      ...session.user,
      roles: token.roles as string[] || [],
    },
  };
}
```

**Zitadel 역할 Claim 형식:**
- 역할은 `urn:zitadel:iam:org:project:roles`에 객체 형태로 저장됨
- 키는 역할 이름, 값은 역할 메타데이터
- `Object.keys(roles)`를 사용하여 역할 이름 추출

### 3. AuthProvider 업데이트

**[src/providers/AuthProvider.tsx](file:///Users/hwan/github/h001-lab/OpenCSP-console/fe/src/providers/AuthProvider.tsx)**

세션에서 Zustand로 역할을 동기화하도록 업데이트:

```typescript
const user: AuthUser = {
  id: session.user.id || "",
  name: session.user.name || undefined,
  email: session.user.email || undefined,
  image: session.user.image || undefined,
  roles: (session.user as any).roles || [], // 세션에서 역할 추출
};
```

### 4. Layout 컴포넌트

**[src/components/Layout/Layout.tsx](file:///Users/hwan/github/h001-lab/OpenCSP-console/fe/src/components/Layout/Layout.tsx)**

관리자 링크에 조건부 렌더링 추가:

```typescript
import { useAuthStore } from "@/stores/authStore";

export default function Layout({ children, navDomain, sidebarDomain }: LayoutProps) {
  const isAdmin = useAuthStore((state) => state.isAdmin());
  
  return (
    <NavBar
      center={
        <>
          <Link href="/">{nav.home}</Link>
          <Link href="/dashboard">{nav.dashboard}</Link>
          <Link href="/announcements">{nav.announcements}</Link>
          {isAdmin && <Link href="/admin">{nav.admin}</Link>}
        </>
      }
    />
  );
}
```

## 사용 방법

### 컴포넌트에서 역할 확인하기

```typescript
import { useAuthStore } from "@/stores/authStore";

function MyComponent() {
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const hasRole = useAuthStore((state) => state.hasRole);
  
  // admin 역할 확인
  if (isAdmin) {
    return <AdminPanel />;
  }
  
  // 특정 역할 확인
  if (hasRole('moderator')) {
    return <ModeratorTools />;
  }
  
  return <RegularContent />;
}
```

### 사용자 역할 접근하기

```typescript
const user = useAuthStore((state) => state.user);
const roles = user?.roles || [];

console.log('사용자 역할:', roles); // ['admin', 'user', ...]
```

## Zitadel 설정

ID 토큰에 역할을 포함시키려면 Zitadel 애플리케이션에서 다음을 설정해야 합니다:

1. **토큰 설정**:
   - ✅ "User roles inside ID Token" 활성화
   - ✅ "User Info inside ID Token" 활성화

2. **프로젝트 역할 정의**:
   - Zitadel 프로젝트에서 역할 생성 (예: `admin`, `user`, `moderator`)
   - 사용자에게 역할 할당

3. **스코프 설정**:
   - 인증 시 `urn:zitadel:iam:org:project:id:zitadel:aud` 스코프 포함

## 테스트

### Admin 역할 없이
- 관리자 링크가 네비게이션에서 **숨김**
- 다른 페이지(홈, 대시보드, 공지사항)는 접근 가능

### Admin 역할 있을 때
- 관리자 링크가 네비게이션에 **표시**
- `/admin` 페이지 접근 가능

## 보안 주의사항

> [!WARNING]
> **클라이언트 측 보호만 제공**
> 
> 이 구현은 UI 요소만 숨깁니다. 진정한 보안을 위해서는:
> - NextAuth 미들웨어를 사용한 서버 측 라우트 보호 구현
> - API 라우트에서 요청 처리 전 역할 검증
> - 클라이언트 측 역할 확인만으로 인가를 결정하지 말 것

### 권장 서버 측 보호

```typescript
// middleware.ts
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const token = req.auth;
  const roles = (token?.user as any)?.roles || [];
  
  if (req.nextUrl.pathname.startsWith("/admin")) {
    if (!roles.includes("admin")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
```

## 요약

✅ Zitadel ID 토큰에서 역할 추출  
✅ Zustand 스토어에 역할 저장  
✅ 헬퍼 메서드(`hasRole`, `isAdmin`) 사용 가능  
✅ 관리자 링크 조건부 렌더링  
✅ 다른 역할로 쉽게 확장 가능  

이제 애플리케이션 전체에서 역할 기반 접근 제어를 사용할 준비가 되었습니다.
