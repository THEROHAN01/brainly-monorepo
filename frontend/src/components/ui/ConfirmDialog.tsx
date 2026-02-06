import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger'
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-brand-surface rounded-xl shadow-2xl w-full max-w-md p-6 border border-brand-border mx-4">
        <h2 className="text-xl font-bold text-brand-text mb-2">{title}</h2>
        <p className="text-brand-text/70 mb-6">{message}</p>

        <div className="flex gap-3 justify-end">
          <Button
            onClick={onCancel}
            variant="secondary"
            text={cancelText}
          />
          <Button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            variant="primary"
            text={confirmText}
            className={variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : ''}
          />
        </div>
      </div>
    </div>
  );
}
