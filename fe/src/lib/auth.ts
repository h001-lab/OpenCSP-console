import NextAuth from "next-auth";
import Zitadel from "next-auth/providers/zitadel";

interface ZitadelProfile {
  'urn:zitadel:iam:org:project:roles'?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ExtendedToken {
  accessToken?: string;
  idToken?: string;
  roles?: Record<string, unknown>;
  [key: string]: unknown;
}

interface ExtendedUser {
  accessToken?: string;
  idToken?: string;
  roles?: string[];
  [key: string]: unknown;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Zitadel({
      issuer: process.env.ZITADEL_ISSUER,
      clientId: process.env.ZITADEL_CLIENT_ID,
      authorization: {
        params: {
          scope: "openid email profile urn:zitadel:iam:org:project:id:zitadel:aud",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // 초기 로그인 시 프로필 정보를 토큰에 저장
      if (account && profile) {
        const extToken = token as ExtendedToken;
        extToken.accessToken = account.access_token;
        extToken.idToken = account.id_token;
        extToken.roles = (profile as ZitadelProfile)?.['urn:zitadel:iam:org:project:roles'] || {};
      }
      return token;
    },
    async session({ session, token }) {
      // 세션에 토큰 정보 추가
      if (session.user) {
        const extToken = token as ExtendedToken;
        const extUser = session.user as unknown as ExtendedUser;
        extUser.accessToken = extToken.accessToken;
        extUser.idToken = extToken.idToken;
        extUser.roles = extToken.roles ? Object.keys(extToken.roles) : [];
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
});
