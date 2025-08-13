import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Files, MessageCircleQuestion, CalendarClock, FileText, Search, LifeBuoy, Settings, LayoutDashboard } from "lucide-react";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/workspace", label: "Workspace", icon: LayoutDashboard },
  { to: "/evidence", label: "Library", icon: Files },
  { to: "/assistant", label: "Chat", icon: MessageCircleQuestion },
  { to: "/timeline", label: "Timeline", icon: CalendarClock },
  { to: "/forms", label: "Forms", icon: FileText },
  { to: "/taskboard", label: "Taskboard", icon: FileText },
  { to: "/search", label: "Search", icon: Search },
  { to: "/find-help", label: "Find Help", icon: LifeBuoy },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
        <aside className="border-r bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="h-16 flex items-center px-4 border-b">
            <div className="font-semibold tracking-tight">NSW Evidence</div>
          </div>
          <nav className="p-2 space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <Icon className="size-4" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t mt-2">
            <button
              className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
            >
              Sign out
            </button>
          </div>
        </aside>
        <main className="min-h-screen">
          <DisclaimerBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
