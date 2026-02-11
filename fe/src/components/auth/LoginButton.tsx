"use client";

import { signIn, signOut } from "next-auth/react";
import { useAuthStore } from "@/stores/authStore";

export function LoginButton() {
    const { user, isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) {
        return (
            <button
                disabled
                className="px-4 py-2 bg-gray-300 text-gray-600 rounded-md cursor-not-allowed"
            >
                Loading...
            </button>
        );
    }

    if (isAuthenticated && user) {
        return (
            <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-900">{user.name || user.email}</span>
                    {user.email && user.name && (
                        <span className="text-xs text-gray-500">{user.email}</span>
                    )}
                </div>
                <button
                    onClick={() => signOut()}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                    Logout
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => signIn("zitadel")}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
            Login
        </button>
    );
}
