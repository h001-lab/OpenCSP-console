"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { signIn } from 'next-auth/react';

/**
 * Admin 페이지 접근 제어 훅.
 * - setup 모드(iam.provider=none): 로그인 없이 접근 허용
 * - zitadel 모드: admin 역할 보유 사용자만 접근 허용
 */
export function useAdminProtection() {
  const { isAdmin, isLoading, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [setupMode, setSetupMode] = useState<boolean | null>(null); // null = 확인 중
  const redirecting = useRef(false);

  useEffect(() => {
    fetch("/api/setup-status")
      .then((r) => r.json())
      .then((d) => setSetupMode(d.iamProvider === "none"))
      .catch(() => setSetupMode(false));
  }, []);

  useEffect(() => {
    if (setupMode === null) return; // setup 상태 확인 중
    if (setupMode) return;          // setup 모드: 인증 불필요
    if (isLoading) return;
    if (redirecting.current) return;
    if (!isAuthenticated) {
      redirecting.current = true;
      signIn("zitadel");
      return;
    }
    if (!isAdmin()) router.replace('/');
  }, [setupMode, isLoading, isAuthenticated, isAdmin, router]);

  if (setupMode === null) return false; // 확인 중: 아직 렌더 안 함
  if (setupMode) return true;           // setup 모드: 허용
  return isAdmin();
}
