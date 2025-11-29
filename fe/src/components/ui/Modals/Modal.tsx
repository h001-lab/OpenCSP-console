"use client";

import styles from "./Modal.module.css";

interface ModalProps {
  open: boolean;
  title?: string;
  children?: React.ReactNode;
  onClose?: () => void;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
}

export function Modal({
  open,
  title,
  children,
  onClose,
  onSubmit,
  submitText = "확인",
  cancelText = "취소"
}: ModalProps) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} flex flex-col gap-2`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <div className={styles.header}>{title}</div>}

        <div>{children}</div>

        <div className={styles.footer}>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1 text-sm border border-gray-300 rounded-[3px] hover:bg-gray-100"
            >
              {cancelText}
            </button>
          )}

          {onSubmit && (
            <button
              onClick={onSubmit}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-[3px] hover:bg-blue-700"
            >
              {submitText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}