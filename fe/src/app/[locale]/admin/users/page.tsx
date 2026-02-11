"use client";

import { useEffect, useState } from "react";
import { ZitadelUser } from "@/types/admin";
import Layout from "@/components/Layout/Layout";
import { DenseTable, Button } from "@h001/ui";
import { Column } from "@/components/types";
import { useAdminProtection } from "@/hooks/useAdminProtection";

// DenseTable용 간단한 사용자 데이터 타입
interface UserTableRow {
    userName: string;
    email: string;
    loginName: string;
    roles: string;
    status: string;
    createdAt: string;
}

export default function UsersPage() {
    const isAdmin = useAdminProtection();
    const [users, setUsers] = useState<ZitadelUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    async function fetchUsers() {
        try {
            setLoading(true);
            setError(null);

            const response = await fetch('/api/admin/users');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch users');
            }

            const data = await response.json();
            setUsers(data.result || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }

    // admin이 아니면 아무것도 렌더링하지 않음 (리디렉션 중)
    if (!isAdmin) {
        return null;
    }

    // DenseTable용 데이터 변환
    const tableData: UserTableRow[] = users.map(user => ({
        userName: user.human?.profile.displayName || user.userName,
        email: user.human?.email.email || '-',
        loginName: user.preferredLoginName,
        roles: user.roles && user.roles.length > 0 ? user.roles.join(', ') : '-',
        status: user.state === 'USER_STATE_ACTIVE' ? '활성' :
            user.state === 'USER_STATE_INACTIVE' ? '비활성' :
                user.state === 'USER_STATE_LOCKED' ? '잠김' : '삭제됨',
        createdAt: user.creationDate ? new Date(user.creationDate).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }) : '-',
    }));

    // DenseTable 컬럼 정의
    const columns: Column<UserTableRow>[] = [
        { key: "userName", label: "사용자명", width: "15%" },
        { key: "email", label: "이메일", width: "20%" },
        { key: "loginName", label: "로그인 ID", width: "20%" },
        { key: "roles", label: "역할", width: "20%" },
        { key: "status", label: "상태", width: "10%" },
        { key: "createdAt", label: "생성일", width: "15%" },
    ];

    return (
        <Layout navDomain="Nav" sidebarDomain="Admin">
            <main className="p-3 gap-3">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-700 mb-2">
                        사용자 관리
                    </h2>
                    <hr />
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-12 bg-white rounded-lg border">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-sm text-gray-600">사용자 목록을 불러오는 중...</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start">
                            <svg className="h-5 w-5 text-red-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div className="ml-2">
                                <h3 className="text-sm font-medium text-red-800">오류 발생</h3>
                                <p className="mt-1 text-sm text-red-700">{error}</p>
                                <button
                                    onClick={fetchUsers}
                                    className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline"
                                >
                                    다시 시도
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {!loading && !error && (
                    <div className="bg-white rounded-lg border">
                        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900">
                                전체 사용자 ({users.length}명)
                            </h3>
                            <Button
                                variant="default"
                                onClick={fetchUsers}
                                className="text-xs px-3 py-1.5"
                            >
                                새로고침
                            </Button>
                        </div>

                        <DenseTable<UserTableRow>
                            data={tableData}
                            columns={columns}
                        />

                        {users.length === 0 && (
                            <div className="text-center py-12">
                                <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">사용자 없음</h3>
                                <p className="mt-1 text-sm text-gray-500">등록된 사용자가 없습니다.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </Layout>
    );
}
