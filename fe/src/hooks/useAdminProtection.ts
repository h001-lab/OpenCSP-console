"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

/**
 * Admin 페이지 접근 제어 훅
 * Admin 역할이 없는 사용자를 404 페이지로 리디렉션합니다.
 */
export function useAdminProtection() {
  const { isAdmin, isLoading, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // 로딩 중이면 대기
    if (isLoading) {
      return;
    }

    // 인증되지 않았거나 admin 역할이 없으면 404로 리다이렉트
    if (!isAuthenticated || !isAdmin()) {
      router.replace('/404');
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  return isAdmin();
}
