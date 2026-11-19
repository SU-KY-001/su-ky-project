import { LandingHeader, LandingFooter } from "@/features/landing";
import { AccountSettings } from "@/features/auth";

export function AccountPage() {
  return <div id="landing-page" className="min-h-screen bg-paper text-ink">
    <LandingHeader surface />
    <main className="pb-20"><AccountSettings /></main>
    <LandingFooter />
  </div>;
}
