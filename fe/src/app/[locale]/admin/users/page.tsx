"use client";

import { useCallback, useEffect, useState } from "react";
import Layout from "@/components/Layout/Layout";
import { DenseTable, Button } from "@h001/ui";
import { Column } from "@/components/types";
import { useAdminProtection } from "@/hooks/useAdminProtection";
import { useMsg } from "@/providers/MessagesProvider";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHead, CardBody } from "@/components/ui/card";
import { AlertCircle, Users } from "lucide-react";

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

    const fetchUsers = useCallback(async () => {
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
            setError(err instanceof Error ? err.message : t.unknownError);
        } finally {
            setLoading(false);
        }
    }, [adminMsg]);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin, fetchUsers]);

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

    const countLabel = error ? t.listTitle : t.totalTitle.replace("{count}", String(users.length));
    const headerActions = (
        <>
            <Button variant="default" onClick={syncUsers} disabled={syncing} className="text-xs px-3 py-1.5">
                {syncing ? t.syncing : t.syncBtn}
            </Button>
            <Button variant="default" onClick={fetchUsers} className="text-xs px-3 py-1.5">
                {t.refresh}
            </Button>
        </>
    );

    return (
        <Layout navDomain="Nav" sidebarDomain="Admin">
            <PageHeader title={t.title} />

            {syncResult && (
                <div style={{
                    background: "var(--ok-50)", border: "1px solid var(--ok-600)",
                    borderRadius: "var(--r-md)", padding: "10px 14px", marginBottom: "16px",
                    fontSize: "13px", color: "var(--ok-600)",
                }}>
                    {t.syncComplete
                        .replace("{total}", String(syncResult.total))
                        .replace("{created}", String(syncResult.created))
                        .replace("{updated}", String(syncResult.updated))}
                </div>
            )}

            {loading ? (
                <Card>
                    <CardBody style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 16px" }}>
                        <div style={{ width: 24, height: 24, border: "2px solid var(--brand-600)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                        <span style={{ marginLeft: 12, fontSize: "13px", color: "var(--fg-muted)" }}>{t.loading}</span>
                    </CardBody>
                </Card>
            ) : (
                <Card>
                    <CardHead title={countLabel} actions={headerActions} />

                    {error ? (
                        <CardBody style={{ textAlign: "center", padding: "32px 16px" }}>
                            <AlertCircle size={28} style={{ color: "var(--danger-600)", margin: "0 auto 8px" }} />
                            <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: "var(--danger-600)" }}>{error}</p>
                            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--fg-muted)" }}>{t.errorHint}</p>
                        </CardBody>
                    ) : (
                        <>
                            <DenseTable<UserTableRow> data={tableData} columns={columns} />
                            {users.length === 0 && (
                                <CardBody style={{ textAlign: "center", padding: "40px 16px" }}>
                                    <Users size={32} style={{ color: "var(--fg-disabled)", margin: "0 auto 8px" }} />
                                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 500, color: "var(--fg-secondary)" }}>{t.empty.title}</p>
                                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--fg-muted)" }}>{t.empty.description}</p>
                                </CardBody>
                            )}
                        </>
                    )}
                </Card>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </Layout>
    );
}
