import { LandingHeader, LandingFooter } from "@/features/landing";
import { MembershipDashboard } from "@/features/membership";

export function MembershipPage() {
  return <div id="landing-page" className="min-h-screen bg-paper text-ink">
    <LandingHeader surface />
    <main className="mx-auto min-h-[80vh] max-w-5xl px-5 pb-20 pt-32 sm:px-8"><MembershipDashboard /></main>
    <LandingFooter />
  </div>;
}
