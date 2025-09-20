import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { 
  Files, 
  MessageCircleQuestion, 
  CalendarClock, 
  Search, 
  LifeBuoy, 
  Settings, 
  BarChart3, 
  LogOut, 
  Scale,
  BookOpen,
  Gavel
} from "lucide-react";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";

// Organized navigation structure
const navGroups = [
  {
    label: "Case Management",
    items: [
      { to: "/", label: "My Case", icon: BarChart3 },
      { to: "/evidence", label: "Evidence", icon: Files },
      { to: "/timeline", label: "Timeline", icon: CalendarClock },
    ]
  },
  {
    label: "Legal Tools", 
    items: [
      { to: "/legal", label: "NSW Legal", icon: Scale },
      { to: "/legal-process", label: "Process Guide", icon: BookOpen },
      { to: "/search", label: "Search", icon: Search },
    ]
  },
  {
    label: "Support & Settings",
    items: [
      { to: "/find-help", label: "Support", icon: LifeBuoy },
      { to: "/settings", label: "Settings", icon: Settings },
    ]
  }
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAssistantPage = location.pathname === "/assistant";
  const [isChatOpen, setIsChatOpen] = useState(false);

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
              onClick={() => navigate('/lawyer-chat')}
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6"
            >
              <MessageCircleQuestion className="h-5 w-5" />
              Lawyer Chat
            </Button>
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
        {/* Elegant grouped sidebar */}
        <aside className="w-64 border-r bg-sidebar-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-sidebar-background/95 min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="p-4 space-y-6">
            {navGroups.map((group, groupIndex) => (
              <div key={group.label} className="space-y-2">
                {groupIndex > 0 && <Separator className="my-4" />}
                <div className="px-2 py-1">
                  <h4 className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
                    {group.label}
                  </h4>
                </div>
                <div className="space-y-1">
                  {group.items.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === "/"}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                            : "text-sidebar-foreground"
                        )
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main content area */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] relative">
          <DisclaimerBanner />
          <div className="fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Chat Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-4xl h-[80vh] shadow-2xl border-0 overflow-hidden">
            <ChatInterface isModal onClose={() => setIsChatOpen(false)} />
          </Card>
        </div>
      )}
    </div>
  );
}
