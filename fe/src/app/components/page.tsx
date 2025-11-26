"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/Panel/Panel";

import { Modal } from "@/components/modals/Modal";
import { FormModal } from "@/components/modals/FormModal";
import { InputModal } from "@/components/modals/InputModal";
import { ConfirmModal } from "@/components/modals/ConfirmModal";

import { Button } from "@/components/ui/Button/Button";
import { Input } from "@/components/ui/Input/Input";
import { Select } from "@/components/ui/Select/Select";
import { Toggle } from "@/components/ui/Toggle/Toggle";
import { Tag } from "@/components/ui/Tag/Tag";

import { DenseTable } from "@/components/table/DenseTable";
import { ListPanel } from "@/components/ui/ListPanel/ListPanel";
import { PanelList } from "@/components/wrappers/PanelList";
import { Instance, Column } from "@/components/types";


const columns: Column<Instance>[] = [
  { key: "name", label: "Name", width: "20%" },
  { key: "type", label: "Type", width: "20%" },
  { key: "status", label: "Status" },
  { key: "created", label: "Created", width: "30%" },
];

const data: Instance[] = [
  { name: "EC2", type: "t3.medium", status: "Running", created: "2023-10-10" },
  { name: "S3", type: "Bucket", status: "Active", created: "2023-10-10"},
];

const items = [
	{ title: "EC2", description: "Compute Instances", actionLabel: "Detail" },
	{ title: "S3", description: "Storage Buckets", actionLabel: "Open" },
	{ title: "RDS", description: "Relational Databases" },
	{
		title: "Lambda",
		description: "Serverless Functions",
		actionLabel: "Manage",
	},
];

export default function Page() {
	const [open, setOpen] = useState(false);
	const [formOpen, setFormOpen] = useState(false);
	const [titleOpen, setTitleOpen] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [toggleValue, setToggleValue] = useState(false);

	return (
		<>
			<p>컴포넌트 예시</p>

			<div className="flex items-center gap-2 direction col mb-4">
				<Input placeholder="제목 입력" />
				<Button>추가</Button>
			</div>

			<Panel title="AWS / GCP 스타일 패널">
				<div>패널 내부 콘텐츠입니다.</div>
				<div className="text-sm text-gray-600">컴팩트 + 엔터프라이즈 UI</div>
			</Panel>

			<Panel title="System Info">
				<div>Instance Type: t3.medium</div>
				<div>Status: Running</div>
			</Panel>

			{/* --- Modal 예시 --- */}
			<Panel title="Modal 예시">
				<div className="flex gap-3">
					<Button onClick={() => setOpen(true)}>기본 모달</Button>
					<Button onClick={() => setTitleOpen(true)}>Input 모달</Button>
					<Button onClick={() => setFormOpen(true)}>Form 모달</Button>
					<Button variant="danger" onClick={() => setConfirmOpen(true)}>
						Confirm
					</Button>
				</div>

				{/* Base Modal */}
				<Modal
					open={open}
					title="이슈 제목 입력"
					onClose={() => setOpen(false)}
					onSubmit={() => setOpen(false)}
				>
					<Input placeholder="제목 입력" />
				</Modal>

				{/* Input Modal */}
				<InputModal
					open={titleOpen}
					title="제목 입력"
					placeholder="이슈 제목을 입력하세요"
					onSubmit={() => setTitleOpen(false)}
					onCancel={() => setTitleOpen(false)}
				/>

				{/* Form Modal */}
				<FormModal
					open={formOpen}
					title="이슈 수정"
					onSubmit={() => setFormOpen(false)}
					onCancel={() => setFormOpen(false)}
				>
					<Input placeholder="제목" />
					<textarea
						className="border p-2 text-sm rounded-[3px]"
						rows={3}
						placeholder="내용"
					/>
				</FormModal>

				{/* Confirm Modal */}
				<ConfirmModal
					open={confirmOpen}
					title="삭제 확인"
					message="이 이슈를 삭제하시겠습니까?"
					onConfirm={() => setConfirmOpen(false)}
					onCancel={() => setConfirmOpen(false)}
				/>
			</Panel>

			{/* --- Button 예시 --- */}
			<Panel title="Button 컴포넌트">
				<div className="flex gap-3 items-center">
					<Button>Neutral</Button>
					<Button variant="primary">Primary</Button>
					<Button variant="danger">Danger</Button>
					<Button variant="ghost">Ghost</Button>
				</div>
			</Panel>

			{/* --- Input 예시 --- */}
			<Panel title="Input 컴포넌트">
				<Input placeholder="엔터프라이즈 Dense Input" />
			</Panel>

			{/* --- Select 예시 --- */}
			<Panel title="Select 컴포넌트">
				<Select>
					<option>옵션 1</option>
					<option>옵션 2</option>
					<option>옵션 3</option>
				</Select>
			</Panel>

			{/* --- Toggle 예시 --- */}
			<Panel title="Toggle 컴포넌트">
				<Toggle value={toggleValue} onChange={setToggleValue} />
			</Panel>

			{/* --- Tag 예시 --- */}
			<Panel title="Tag 컴포넌트">
				<div className="flex gap-3">
					<Tag type="success">Success</Tag>
					<Tag type="warning">Warning</Tag>
					<Tag type="error">Error</Tag>
					<Tag type="info">Info</Tag>
				</div>
			</Panel>

			{/* Dense Table */}
			<Panel title="Dense Table (AWS 스타일)">
				<DenseTable<Instance> columns={columns} data={data} />
			</Panel>

			<p>Panel</p>
			<div className="flex gap-6 p-4 border border-gray-300 rounded mb-6">
				<Panel title="AWS / GCP 스타일 패널">
					<div>패널 내부 콘텐츠입니다.</div>
					<div className="text-sm text-gray-600">컴팩트 + 엔터프라이즈 UI</div>
					<Button>Detail</Button>
				</Panel>
				<Panel title="AWS / GCP 스타일 패널">
					<div>패널 내부 콘텐츠입니다.</div>
					<div className="text-sm text-gray-600">컴팩트 + 엔터프라이즈 UI</div>
					<Button>Detail</Button>
				</Panel>
			</div>

			<div className="mb-6">
				<p>ListPanel</p>
				<ListPanel
					title="List Panel Example"
					right={<Button variant="ghost">Open</Button>}
				>
					<div>리스트 패널 내부 콘텐츠입니다.</div>
					<div className="text-sm text-gray-600">간단한 설명 텍스트</div>
					<Button>Show</Button>
				</ListPanel>
			</div>

			<div className="flex flex-col gap-6  border border-gray-300 rounded mb-6 p-4">
				<p>PanelList</p>
				<PanelList items={items} />
			</div>
		</>
	);
}
