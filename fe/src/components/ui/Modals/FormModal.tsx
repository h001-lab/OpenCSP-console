"use client";

import { Modal } from "./Modal";

interface FormModalProps {
  open: boolean;
  title?: string;
  children: React.ReactNode;
  onSubmit: () => void;
  onCancel: () => void;
  submitText?: string;
  cancelText?: string;
}

export function FormModal({
  open,
  title = "입력",
  children,
  onSubmit,
  onCancel,
  submitText = "저장",
  cancelText = "취소",
}: FormModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onSubmit={onSubmit}
      onClose={onCancel}
      submitText={submitText}
      cancelText={cancelText}
    >
      <div className="flex flex-col gap-3">{children}</div>
    </Modal>
  );
}