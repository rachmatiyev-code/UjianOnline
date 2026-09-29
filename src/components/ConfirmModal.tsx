import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  description: string;
  AffectedItems?: string[];
  confirmLabel: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
}

interface ConfirmModalProps {
  dialog: ConfirmDialogState;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ dialog, onClose }) => {
  if (!dialog.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle
              className={`w-5 h-5 shrink-0 ${
                dialog.variant === 'danger' ? 'text-red-600' : 'text-sky-700'
              }`}
            />
            <h3 className="text-base font-semibold text-slate-900">{dialog.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
            aria-label="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{dialog.description}</p>

        {dialog.AffectedItems && dialog.AffectedItems.length > 0 && (
          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-36 overflow-y-auto">
            <div className="text-xs font-semibold text-slate-700 mb-1.5">
              Rincian Data Terdampak ({dialog.AffectedItems.length} item):
            </div>
            <ul className="space-y-1 text-xs text-slate-600 font-mono">
              {dialog.AffectedItems.slice(0, 8).map((item, idx) => (
                <li key={idx} className="truncate">
                  · {item}
                </li>
              ))}
              {dialog.AffectedItems.length > 8 && (
                <li className="text-slate-400">
                  ...dan {dialog.AffectedItems.length - 8} data lainnya
                </li>
              )}
            </ul>
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              dialog.onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap ${
              dialog.variant === 'danger'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-sky-700 hover:bg-sky-800'
            }`}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
