import { AlertCircle } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-foreground/30 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="bg-surface rounded-2xl border border-border shadow-panel w-full max-w-sm p-6">
        {/* Icon and title */}
        <div className="flex items-start gap-4">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isDestructive ? "bg-destructive/10" : "bg-warning/10"}`}
          >
            <AlertCircle
              className={`w-5 h-5 ${isDestructive ? "text-destructive" : "text-warning"}`}
            />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-foreground">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="h-9 px-4 rounded-lg border border-border bg-surface text-sm font-display font-semibold text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`h-9 px-4 rounded-lg text-white text-sm font-display font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isDestructive
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-brand hover:bg-brand/90"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Loading...</span>
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
