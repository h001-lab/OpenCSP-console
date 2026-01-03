"use client";

import Layout from "@/components/Layout/Layout";
import { useMsg } from "@/providers/MessagesProvider";
import { Button, DenseTable, EnhancedTable, FormModal } from "@h001/ui";
import { useEffect, useState } from "react";
import { Column } from "@/components/types";

interface InstancesPageMessage {
	title: string;
}

const useHash = () => {
	const [hash, setHash] = useState("");

	useEffect(() => {
		const getHash = () => (typeof window !== "undefined" ? window.location.hash.replace("#", "") : "");
		setHash(getHash());

		const handleHashChange = () => {
			setHash(getHash());
		};

		window.addEventListener("hashchange", handleHashChange);

		return () => {
			window.removeEventListener("hashchange", handleHashChange);
		};
	}, []);

	return hash;
};

interface DummyInstance {
	name: string;
	version: string;
	arch: string;
}

const dummyInstanceColumns: Column<DummyInstance>[] = [
	{ key: "name", label: "이미지 이름", width: "40%" },
	{ key: "version", label: "버전", width: "30%" },
	{ key: "arch", label: "아키텍처", width: "30%" },
];

const dummyInstanceData: DummyInstance[] = [
	{ name: "Ubuntu Server", version: "22.04 LTS", arch: "x86_64" },
	{ name: "CentOS Stream", version: "9", arch: "x86_64" },
	{ name: "Rocky Linux", version: "9.3", arch: "arm64" },
	{ name: "Debian", version: "12 (Bookworm)", arch: "x86_64" },
	{ name: "Fedora Cloud", version: "39", arch: "x86_64" },
];

const InstancesView = ({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) => (
	<div className="p-4 bg-gray-50 border border-blue-200 rounded">
		<div className="flex justify-end p-4">
			<Button variant="default" onClick={() => setOpen(true)}>
				인스턴스 추가
			</Button>
			<FormModal
				title="인스턴스 추가"
				open={open}
				onSubmit={() => setOpen(false)}
				onCancel={() => setOpen(false)}
				children={<div className="flex flex-col gap-4 items-center">
					<DenseTable<DummyInstance> data={dummyInstanceData} columns={dummyInstanceColumns} />
				</div>}
			/>
		</div>
		<EnhancedTable
			title="인스턴스 목록"
			headCells={[
				{ id: "name", label: "인스턴스 이름", numeric: false, disablePadding: false },
				{ id: "status", label: "상태", numeric: false, disablePadding: false },
				{ id: "type", label: "인스턴스 유형", numeric: false, disablePadding: false },
				{ id: "ip", label: "IP 주소", numeric: false, disablePadding: false },
			]}
			rows={[
				{ id: 1, name: "web-prod-01", status: "Running", type: "c5.xlarge", ip: "54.123.45.67" },
				{ id: 2, name: "web-prod-02", status: "Running", type: "c5.xlarge", ip: "54.123.45.68" },
				{ id: 3, name: "db-primary", status: "Running", type: "m5.2xlarge", ip: "10.0.1.10" },
				{ id: 4, name: "db-replica-01", status: "Running", type: "m5.2xlarge", ip: "10.0.1.11" },
				{ id: 5, name: "redis-cache", status: "Running", type: "t3.medium", ip: "10.0.2.5" },
				{ id: 6, name: "bastion-host", status: "Running", type: "t3.nano", ip: "3.34.56.78" },
				{ id: 7, name: "jenkins-ci", status: "Stopped", type: "t3.large", ip: "52.78.12.34" },
				{ id: 8, name: "staging-api", status: "Running", type: "t3.medium", ip: "13.124.5.6" },
				{ id: 9, name: "monitoring-node", status: "Running", type: "t3.medium", ip: "13.125.6.7" },
				{ id: 10, name: "ml-training-01", status: "Stopped", type: "g4dn.xlarge", ip: "54.192.3.4" },
				{ id: 11, name: "worker-node-01", status: "Running", type: "c5.2xlarge", ip: "192.168.1.101" },
				{ id: 12, name: "worker-node-02", status: "Running", type: "c5.2xlarge", ip: "192.168.1.102" },
				{ id: 13, name: "worker-node-03", status: "Running", type: "c5.2xlarge", ip: "192.168.1.103" },
				{ id: 14, name: "test-env-01", status: "Terminated", type: "t2.micro", ip: "-" },
				{ id: 15, name: "backup-server", status: "Running", type: "m5.large", ip: "10.0.5.20" },
			]}
		/>
	</div>
);

const SettingsView = () => (
	<div className="p-4 bg-gray-50 border border-gray-200 rounded">
		<h2 className="text-xl font-bold">설정</h2>
		<p>계정 및 앱 설정을 하는 곳입니다.</p>
	</div>
);

export default function Page() {
	const [open, setOpen] = useState(false);
	const t = useMsg("Instances") as unknown as InstancesPageMessage;
	if (!t) return null;

	const hash = useHash();
	const activeTab = hash || "instances";

	return (
		<Layout navDomain="Nav" sidebarDomain="Instances">
			<main className="p-6 gap-6">
				<div className="mb-6">
					{activeTab === "instances" && <InstancesView open={open} setOpen={setOpen} />}
					{activeTab === "settings" && <SettingsView />}
				</div>
			</main>
		</Layout>
	);
}
