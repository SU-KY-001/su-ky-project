import { useNavigate } from "react-router";
import { Dialog, DialogContent } from "@/shared/components/ui/dialog";
import { AuthDialog } from "@/features/auth/components/AuthDialog";

export function LoginDialog() {
  const navigate = useNavigate();

  return (
    <Dialog open onOpenChange={(open) => { if (!open) void navigate("/", { replace: true }); }}>
      <DialogContent className="auth-dialog-content">
        <AuthDialog />
      </DialogContent>
    </Dialog>
  );
}
