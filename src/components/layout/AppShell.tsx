import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { ErrorBoundary } from "../ErrorBoundary";
import { OnboardingTour } from "../onboarding/OnboardingTour";
import { KeyboardShortcuts } from "../ui/KeyboardShortcuts";
import { CommandPalette } from "../ui/CommandPalette";
import { BackToTop } from "../ui/BackToTop";

export function AppShell() {
  return (
    <div className="flex min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>
      <Sidebar />
      <main id="main-content" className="min-w-0 flex-1 overflow-x-hidden p-4 pb-20 pt-16 md:ml-56 md:p-6 md:pb-6 md:pt-6">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <BottomNav />
      <OnboardingTour />
      <KeyboardShortcuts />
      <CommandPalette />
      <BackToTop />
    </div>
  );
}
