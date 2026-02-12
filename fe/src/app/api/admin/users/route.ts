import { auth } from "@/lib/auth";
import { zitadelClient } from "@/lib/zitadel-client";
import { NextResponse } from "next/server";

interface SessionUser {
  roles?: string[];
  [key: string]: unknown;
}

export async function GET() {
  try {
    // 세션 확인
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Admin 권한 확인
    const roles = (session.user as SessionUser)?.roles || [];
    if (!roles.includes('admin')) {
      return NextResponse.json(
        { error: 'Forbidden: Admin role required' },
        { status: 403 }
      );
    }

    // Access Token 획득 (session.user에서 가져오기)
    const user = session.user as SessionUser & { accessToken?: string; idToken?: string };
    const userToken = user.accessToken;
    
    if (!userToken) {
      return NextResponse.json(
        { error: 'No access token available' },
        { status: 401 }
      );
    }

    const accessToken = await zitadelClient.getAccessToken(userToken);

    // 사용자 목록 조회
    const data = await zitadelClient.listUsers(accessToken);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
