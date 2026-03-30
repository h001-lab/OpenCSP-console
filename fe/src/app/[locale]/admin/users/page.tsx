"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout/Layout";
import { DenseTable, Button } from "@h001/ui";
import { Column } from "@/components/types";
import { useAdminProtection } from "@/hooks/useAdminProtection";
import { useMsg } from "@/providers/MessagesProvider";

interface AdminUserResponse {
    id: string;
    email: string;
    name: string;
    roles: string[];
    status: string | null;
    syncedAt: string | null;
    createdAt: string | null;
}

interface UserTableRow {
    name: string;
    email: string;
    id: string;
    roles: string;
    status: string;
    syncedAt: string;
}

interface SyncResult {
    total: number;
    created: number;
    updated: number;
}

interface UsersMessages {
    title: string;
    loading: string;
    listTitle: string;
    totalTitle: string;
    syncBtn: string;
    syncing: string;
    refresh: string;
    syncComplete: string;
    syncFailed: string;
    serverError: string;
    unknownError: string;
    errorHint: string;
    empty: { title: string; description: string };
    columns: { name: string; email: string; iamSubject: string; roles: string; status: string; syncedAt: string };
}

export default function UsersPage() {
    const isAdmin = useAdminProtection();
    const adminMsg = useMsg("Admin") as unknown as { users: UsersMessages } | undefined;
    const [users, setUsers] = useState<AdminUserResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    async function fetchUsers() {
        if (!adminMsg) return;
        const t = adminMsg.users;
        try {
            setLoading(true);
            setError(null);
            setSyncResult(null);

            const response = await fetch('/api/admin/users');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const msg = errorData.message || errorData.error
                    || t.serverError.replace("{code}", String(response.status));
                throw new Error(msg);
            }

            const data = await response.json();
            setUsers(data.data || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
            setError(err instanceof Error ? err.message : t.unknownError);
        } finally {
            setLoading(false);
        }
    }

    async function syncUsers() {
        if (!adminMsg) return;
        const t = adminMsg.users;
        try {
            setSyncing(true);
            setError(null);
            setSyncResult(null);

            const response = await fetch('/api/admin/users', { method: 'POST' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || t.syncFailed);
            }

            const data = await response.json();
            setSyncResult(data.data || null);
            await fetchUsers();
        } catch (err) {
            console.error('Failed to sync users:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setSyncing(false);
        }
    }

    if (!isAdmin || !adminMsg) return null;

    const t = adminMsg.users;

    const tableData: UserTableRow[] = users.map(user => ({
        name: user.name || '-',
        email: user.email || '-',
        id: user.id || '-',
        roles: user.roles && user.roles.length > 0 ? user.roles.join(', ') : '-',
        status: user.status || '-',
        syncedAt: user.syncedAt ? new Date(user.syncedAt).toLocaleString() : '-',
    }));

    const columns: Column<UserTableRow>[] = [
        { key: "name",     label: t.columns.name,       width: "15%" },
        { key: "email",    label: t.columns.email,      width: "25%" },
        { key: "id",       label: t.columns.iamSubject, width: "20%" },
        { key: "roles",    label: t.columns.roles,      width: "15%" },
        { key: "status",   label: t.columns.status,     width: "10%" },
        { key: "syncedAt", label: t.columns.syncedAt,   width: "15%" },
    ];

    return (
        <Layout navDomain="Nav" sidebarDomain="Admin">
            <main className="p-3 gap-3">
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-700 mb-2">{t.title}</h2>
                    <hr />
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-12 bg-white rounded-lg border">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                        <span className="ml-3 text-sm text-gray-600">{t.loading}</span>
                    </div>
                )}

                {syncResult && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <p className="text-sm text-green-800">
                            {t.syncComplete
                                .replace("{total}", String(syncResult.total))
                                .replace("{created}", String(syncResult.created))
                                .replace("{updated}", String(syncResult.updated))}
                        </p>
                    </div>
                )}

                {!loading && (
                    <div className="bg-white rounded-lg border">
                        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-900">
                                {error
                                    ? t.listTitle
                                    : t.totalTitle.replace("{count}", String(users.length))}
                            </h3>
                            <div className="flex gap-2">
                                <Button
                                    variant="default"
                                    onClick={syncUsers}
                                    disabled={syncing}
                                    className="text-xs px-3 py-1.5"
                                >
                                    {syncing ? t.syncing : t.syncBtn}
                                </Button>
                                <Button
                                    variant="default"
                                    onClick={fetchUsers}
                                    className="text-xs px-3 py-1.5"
                                >
                                    {t.refresh}
                                </Button>
                            </div>
                        </div>

                        {error && (
                            <div className="px-4 py-6 text-center">
                                <svg className="mx-auto h-8 w-8 text-red-400 mb-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm font-medium text-red-700">{error}</p>
                                <p className="text-xs text-gray-500 mt-1">{t.errorHint}</p>
                            </div>
                        )}

                        {!error && (
                            <>
                                <DenseTable<UserTableRow>
                                    data={tableData}
                                    columns={columns}
                                />
                                {users.length === 0 && (
                                    <div className="text-center py-10">
                                        <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">{t.empty.title}</h3>
                                        <p className="mt-1 text-sm text-gray-500">{t.empty.description}</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </main>
        </Layout>
    );
}
