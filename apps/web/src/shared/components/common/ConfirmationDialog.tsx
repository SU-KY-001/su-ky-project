import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

export interface ConfirmationRequest {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface ConfirmationDialogProps {
  request: ConfirmationRequest | null;
  onResolve: (confirmed: boolean) => void;
}

export function ConfirmationDialog({ request, onResolve }: ConfirmationDialogProps) {
  return <AlertDialog open={Boolean(request)} onOpenChange={(open) => { if (!open) onResolve(false); }}>
    <AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>{request?.title}</AlertDialogTitle><AlertDialogDescription>{request?.description}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => onResolve(false)}>{request?.cancelLabel ?? "Quay lại"}</AlertDialogCancel>
        <AlertDialogAction className={request?.destructive ? "bg-mod-danger hover:bg-mod-danger/90" : undefined} onClick={() => onResolve(true)}>{request?.confirmLabel}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
