"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useAuthStore } from "@/stores/authStore";
import { Link, useMsg } from "@/providers/MessagesProvider";
import { useEffect, useRef, useState } from "react";

interface LoginButtonMessages {
  loading: string;
  setupIntegrations: string;
  dashboard: string;
  billing: string;
  settings: string;
  admin: string;
  logout: string;
  signIn: string;
}

export function LoginButton() {
    const { data: session } = useSession();
    const { user, isAuthenticated, isLoading, isAdmin } = useAuthStore();
    const idToken = session?.user?.idToken;
    const [iamProvider, setIamProvider] = useState<string | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const t = useMsg("LoginButton") as unknown as LoginButtonMessages | undefined;

    useEffect(() => {
        fetch("/api/setup-status")
            .then((r) => r.json())
            .then((d) => setIamProvider(d.iamProvider ?? "none"))
            .catch(() => setIamProvider("unknown"));
    }, []);

    // 외부 클릭 시 메뉴 닫기
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!t) return null;

    // none 모드: 로그인 없이 Admin 메뉴 바로 보여주기
    if (iamProvider === "none") {
        return  (<Link href="/admin/integrations"
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => setMenuOpen(false)}>
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    {t.setupIntegrations}
                                </Link>);
    }
    if (isLoading || iamProvider === null) {
        return (
            <button disabled className="px-3 py-1.5 text-sm bg-gray-100 text-gray-400 rounded-md cursor-not-allowed">
                {t.loading}
            </button>
        );
    }

    // 로그인된 상태: 드롭다운 메뉴
    if (isAuthenticated && user) {
        const initials = (user.name || user.email || "?").charAt(0).toUpperCase();

        return (
            <div className="relative" ref={menuRef}>
                <button
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                >
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                        {initials}
                    </div>
                    <div className="flex flex-col items-start leading-tight">
                        <span className="text-sm font-medium text-gray-900 max-w-28 truncate">{user.name || user.email}</span>
                        {user.name && user.email && (
                            <span className="text-xs text-gray-400 max-w-28 truncate">{user.email}</span>
                        )}
                    </div>
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {menuOpen && (
                    <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                        <Link href="/dashboard"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setMenuOpen(false)}>
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                            </svg>
                            {t.dashboard}
                        </Link>
                        <Link href="/billing"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setMenuOpen(false)}>
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            {t.billing}
                        </Link>
                        <Link href="/settings"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setMenuOpen(false)}>
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {t.settings}
                        </Link>
                        {isAdmin() && (
                            <>
                                <div className="border-t border-gray-100 my-1" />
                                <Link href="/admin"
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => setMenuOpen(false)}>
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    {t.admin}
                                </Link>
                            </>
                        )}
                        <div className="border-t border-gray-100 my-1" />
                        <button
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            onClick={() => {
                                setMenuOpen(false);
                                signOut({ callbackUrl: `/?logout=true${idToken ? `&id_token_hint=${idToken}` : ""}` });
                            }}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            {t.logout}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // IAM 설정됨 + 미로그인: Sign In 버튼
    return (
        <button
            onClick={() => signIn("zitadel")}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
            {t.signIn}
        </button>
    );
}
