import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";
import { MobileBottomNav } from "./MobileBottomNav";

interface AppLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function AppLayout({ title, subtitle, children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar — hidden on mobile */}
      <Sidebar />

      {/* Top navbar — shifts right on desktop, full-width on mobile */}
      <TopNavbar title={title} subtitle={subtitle} />

      {/* Main content — padded left only on desktop */}
      <main className="sm:ml-60 pt-14 sm:pt-16 min-h-screen pb-20 sm:pb-0">
        <div className="p-4 sm:p-6 animate-fade-in">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav — only visible on mobile */}
      <MobileBottomNav />
    </div>
  );
}
