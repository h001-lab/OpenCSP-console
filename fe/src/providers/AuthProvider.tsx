"use client";

import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { useAuthStore } from "@/stores/authStore";

interface SessionUser {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    roles?: string[];
    accessToken?: string;
    idToken?: string;
    [key: string]: unknown;
}

/**
 * AuthSync 컴포넌트
 * NextAuth 세션을 Zustand store와 동기화합니다.
 */
function AuthSync() {
    const { data: session, status } = useSession();
    const { setAuth, clearAuth, setLoading } = useAuthStore();

    useEffect(() => {
        if (status === "loading") {
            setLoading(true);
            return;
        }

        if (status === "authenticated" && session?.user) {
            const user = session.user as SessionUser;

            setAuth(
                {
                    id: user.email || "",
                    name: user.name || undefined,
                    email: user.email || undefined,
                    image: user.image || undefined,
                    roles: user.roles || [],
                },
                {
                    accessToken: user.accessToken || "",
                    idToken: user.idToken || "",
                }
            );
        } else {
            clearAuth();
        }
    }, [session, status, setAuth, clearAuth, setLoading]);

    return null;
}

/**
 * AuthProvider 컴포넌트
 * SessionProvider로 앱을 감싸고 AuthSync를 통해 세션을 store와 동기화합니다.
 * 모든 컴포넌트는 useAuthStore를 통해 인증 상태에 접근해야 합니다.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <AuthSync />
            {children}
        </SessionProvider>
    );
}
