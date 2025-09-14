import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Files, MessageCircleQuestion, CalendarClock, FileText, Search, LifeBuoy, Settings, LayoutDashboard, LogOut, Scale } from "lucide-react";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { ChatButton } from "@/components/chat/ChatButton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/workspace", label: "Workspace", icon: LayoutDashboard },
  { to: "/evidence", label: "Evidence", icon: Files },
  { to: "/assistant", label: "Assistant", icon: MessageCircleQuestion },
  { to: "/legal", label: "NSW Legal", icon: Scale },
  { to: "/timeline", label: "Timeline", icon: CalendarClock },
  { to: "/forms", label: "Forms", icon: FileText },
  { to: "/taskboard", label: "Tasks", icon: FileText },
  { to: "/search", label: "Search", icon: Search },
  { to: "/find-help", label: "Support", icon: LifeBuoy },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAssistantPage = location.pathname === "/assistant";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Professional top header */}
      <header className="border-b bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/80 sticky top-0 z-40">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" />
              <div className="font-semibold text-lg tracking-tight">NSW Legal Evidence</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Elegant sidebar */}
        <aside className="w-64 border-r bg-sidebar-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-sidebar-background/95 min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="p-4 space-y-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground"
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] relative">
          <DisclaimerBanner />
          <div className="fade-in">
            <Outlet />
          </div>
          
          {/* Global Chat Button - Hidden on assistant page */}
          {!isAssistantPage && <ChatButton />}
        </main>
      </div>
    </div>
  );
}
