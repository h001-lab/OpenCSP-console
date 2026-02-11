import NextAuth, { type DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";
import Zitadel from "next-auth/providers/zitadel";

// NextAuth 타입 확장
declare module "next-auth" {
  interface Session {
    error?: "RefreshTokenError";
    user: {
      accessToken?: string;
      idToken?: string;
      roles?: string[];
    } & DefaultSession["user"]
  }

  interface User {
    roles?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    roles?: string[];
    error?: "RefreshTokenError";
  }
}

interface ZitadelProfile {
  'urn:zitadel:iam:org:project:roles'?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ExtendedToken {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt: number;
  roles: string[];
  error?: "RefreshTokenError";
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Zitadel({
      issuer: process.env.ZITADEL_ISSUER,
      clientId: process.env.ZITADEL_CLIENT_ID,
      authorization: {
        params: {
          scope: "openid email profile offline_access urn:zitadel:iam:org:project:id:zitadel:aud",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // 1. 초기 로그인 시: 프로필에서 roles 배열을 생성하여 저장
      if (account && profile) {
        return {
          ...token,
          accessToken: account.access_token,
          idToken: account.id_token,
          refreshToken: account.refresh_token,
          expiresAt: (account.expires_at ?? 0) * 1000,
          // 여기서 확실하게 문자열 배열로 변환하여 저장
          roles: Object.keys((profile as ZitadelProfile)?.['urn:zitadel:iam:org:project:roles'] || {}),
        };
      }

      // 2. 토큰 유효 검사 (만료 전이면 기존 token 그대로 반환)
      if (token.expiresAt && Date.now() < token.expiresAt - 60000) {
        return token;
      }

      // 3. 토큰 만료 시 갱신 시도
      try {
        const response = await fetch(`${process.env.ZITADEL_ISSUER}/oauth/v2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.ZITADEL_CLIENT_ID!,
            grant_type: "refresh_token",
            refresh_token: token.refreshToken!,
          }),
        });

        const tokens = await response.json();
        if (!response.ok) throw tokens;

        return {
          ...token, // 여기에 기존의 roles(배열)가 포함됨 (토큰 갱신시 같이 갱신)
          accessToken: tokens.access_token,
          idToken: tokens.id_token ?? token.idToken,
          refreshToken: tokens.refresh_token ?? token.refreshToken,
          expiresAt: Date.now() + (tokens.expires_in * 1000),
        };
      } catch (error) {
        console.error("Error refreshing access token", error);
        return { ...token, error: "RefreshTokenError" };
      }
    },

    async session({ session, token }) {
      if (session.user) {
        // token.roles가 혹시라도 객체로 들어올 경우를 대비한 최종 안전장치
        const rawRoles = token.roles || [];
        session.user.roles = Array.isArray(rawRoles) 
          ? rawRoles 
          : Object.keys(rawRoles); 
        session.user.idToken = token.idToken;
        session.user.accessToken = token.accessToken;
        session.error = token.error;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.includes('logout=true')) {
        const issuer = process.env.ZITADEL_ISSUER;
        const urlObj = new URL(url, baseUrl);
        const idToken = urlObj.searchParams.get("id_token_hint");
        const endSessionUrl = new URL(`${issuer}/oidc/v1/end_session`);
        endSessionUrl.searchParams.append("post_logout_redirect_uri", baseUrl.replace(/\/$/, ""));
        
        if (idToken) {
          endSessionUrl.searchParams.append("id_token_hint", idToken);
        }

        return endSessionUrl.toString();
      }

      return url.startsWith(baseUrl) ? url : baseUrl;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
});