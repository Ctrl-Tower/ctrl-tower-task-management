"use client";

import { Modal } from "@/components/ui/Modal";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} width="max-w-sm">
      <div className="p-5">
        <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
        {message && <p className="mt-2 text-sm text-neutral-400">{message}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost border border-neutral-700 text-xs">
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="btn bg-neutral-100 text-xs font-semibold text-neutral-900 hover:bg-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
