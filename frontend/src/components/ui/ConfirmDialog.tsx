import { Button } from './Button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './Dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
  loading = false
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6">
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
            loading={loading}
            className={variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : ''}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
