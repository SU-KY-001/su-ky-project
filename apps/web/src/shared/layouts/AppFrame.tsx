import { Outlet, useNavigation } from "react-router";
import { LoadingSpinner } from "../components/common/LoadingSpinner";

export function AppFrame() {
  const navigation = useNavigation();

  return (
    <>
      <Outlet />
      {navigation.state !== "idle" ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-paper/60 backdrop-blur-sm" aria-label="Đang chuyển trang">
          <LoadingSpinner label="Đang chuyển trang…" fullScreen={false} />
        </div>
      ) : null}
    </>
  );
}
