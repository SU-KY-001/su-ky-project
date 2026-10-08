import { useEffect, type ReactElement } from "react";
import { useNavigate } from "react-router";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AuthDialog } from "@/features/auth/components/AuthDialog";
import { LandingPage } from "../landing/LandingPage";

export function LoginPage(): ReactElement {
  const navigate = useNavigate();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Đăng nhập | Sử Ký";
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <>
      <LandingPage />
      <Dialog open onOpenChange={(open) => { if (!open) void navigate("/", { replace: true }); }}>
        <DialogContent className="auth-dialog-content">
          <AuthDialog />
        </DialogContent>
      </Dialog>
    </>
  );
}
