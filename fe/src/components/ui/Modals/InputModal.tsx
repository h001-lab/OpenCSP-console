"use client";

import { useState } from "react";
import { Modal } from "./Modal";

interface InputModalProps {
  open: boolean;
  title?: string;
  placeholder?: string;
  defaultValue?: string;
  submitText?: string;
  cancelText?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function InputModal({
  open,
  title = "입력",
  placeholder = "",
  defaultValue = "",
  submitText = "확인",
  cancelText = "취소",
  onSubmit,
  onCancel,
}: InputModalProps) {
  const [value, setValue] = useState(defaultValue);

  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      onSubmit={() => onSubmit(value)}
      submitText={submitText}
      cancelText={cancelText}
    >
      <input
        className="w-full border border-gray-300 rounded-[3px] p-2 text-sm"
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChange={(e) => setValue(e.target.value)}
      />
    </Modal>
  );
}