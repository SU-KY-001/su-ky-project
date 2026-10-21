import { Component, lazy, Suspense, useEffect, type ReactNode } from "react";
import { HeroCarousel } from "../../features/landing/components/HeroCarousel";
import { LandingHeader } from "../../features/landing/components/LandingHeader";
import { scrollToLandingTarget, useLandingMotion } from "../../features/landing/hooks/useLandingMotion";
import { LightRays } from "@/shared/components/ui/light-rays";
import { Outlet } from "react-router";

const LandingContent = lazy(() => import("./LandingContent").then(({ LandingContent: Content }) => ({ default: Content })));
const LandingFooter = lazy(() => import("./LandingContent").then(({ LandingFooterContent }) => ({ default: LandingFooterContent })));

interface LandingContentBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

class LandingContentBoundary extends Component<LandingContentBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function LandingContentError() {
  return (
    <div className="px-5 py-4 text-sm text-ink-soft" role="alert">
      Câu chuyện nổi bật vẫn sẵn sàng; tải lại trang để thử lấy các phần còn lại.
    </div>
  );
}

function LandingFooterError() {
  return <p className="bg-night px-5 py-6 text-center text-sm text-paper-deep" role="alert">Chưa tải được phần chân trang. Vui lòng tải lại trang để thử lại.</p>;
}

export function LandingPage() {
  useLandingMotion();

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return undefined;
    const frame = window.requestAnimationFrame(() => scrollToLandingTarget(id));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <div id="landing-page" className="landing-scroll-area relative isolate bg-paper">
        <div id="landing-content">
          <LandingHeader />
          <main>
            <HeroCarousel />
            <LandingContentBoundary fallback={<LandingContentError />}>
              <Suspense fallback={null}>
                <LandingContent />
              </Suspense>
            </LandingContentBoundary>
          </main>
          <LandingContentBoundary fallback={<LandingFooterError />}>
            <Suspense fallback={null}>
              <LandingFooter />
            </Suspense>
          </LandingContentBoundary>
        </div>
        <LightRays className="fixed inset-0 z-30 opacity-70" count={6} color="rgba(181, 138, 60, 0.24)" blur={52} speed={22} length="110vh" />
      </div>
      <Outlet />
    </>
  );
}
