"use client";

import { Modal } from "./Modal";

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title = "확인",
  message = "이 작업을 진행하시겠습니까?",
  confirmText = "확인",
  cancelText = "취소",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      onSubmit={onConfirm}
      submitText={confirmText}
      cancelText={cancelText}
    >
      <p className="text-sm text-gray-700 leading-5">{message}</p>
    </Modal>
  );
}