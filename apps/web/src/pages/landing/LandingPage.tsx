import { Component, lazy, Suspense, useEffect, type ReactNode } from "react";
import { HeroCarousel } from "../../features/landing/components/HeroCarousel";
import { LandingHeader } from "../../features/landing/components/LandingHeader";
import { scrollToLandingTarget, useLandingMotion } from "../../features/landing/hooks/useLandingMotion";

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
    <div className="bg-paper-deep px-5 py-4 text-sm text-ink-soft" role="alert">
      Câu chuyện nổi bật vẫn sẵn sàng; tải lại trang để thử lấy các phần còn lại.
    </div>
  );
}

function LandingFooterError() {
  return <p className="bg-night px-5 py-6 text-center text-sm text-paper-deep" role="alert">Phần đăng ký chưa tải được. Hero và các nội dung đã tải vẫn dùng được.</p>;
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
    <div id="landing-page" className="min-h-screen bg-paper">
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
  );
}
