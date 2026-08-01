import { Button } from "@/components/ui/button";
import Brand from "@/components/Brand";
import {
  BookOpen,
  CalendarDays,
  FolderUp,
  Home,
  LayoutDashboard,
  MessageSquareText,
  NotebookPen,
  Settings,
} from "lucide-react";
import { useNavigate, useLocation } from "@/lib/router";
import { useProfile } from "@/hooks/useProfile";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useProfile();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/courses", label: "Courses", icon: BookOpen },
    { path: "/planner", label: "Planner", icon: CalendarDays },
    { path: "/notebook", label: "Notebook", icon: NotebookPen },
    { path: "/upload", label: "Upload", icon: FolderUp },
    { path: "/ai-tutor", label: "AI Tutor", icon: MessageSquareText },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <aside className="sticky top-0 flex h-screen w-20 shrink-0 flex-col border-r border-violet-100/80 bg-white/80 p-3 backdrop-blur-xl md:w-64 md:p-5">
      <div className="mb-8 hidden px-1 md:block"><Brand /></div>
      <div className="mb-8 flex justify-center md:hidden"><Brand compact /></div>

      <div className="mb-4 hidden rounded-2xl bg-gradient-to-br from-blue-50 via-violet-50 to-fuchsia-50 px-4 py-3 md:block">
        <p className="text-xs font-medium uppercase tracking-wider text-violet-500">Your workspace</p>
        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
          {profile?.first_name ? `${profile.first_name}'s library` : "Academic library"}
        </p>
      </div>

      <nav className="space-y-1.5" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Button
              key={item.path}
              variant="ghost"
              className={`w-full justify-center px-3 md:justify-start ${
                active
                  ? "bg-gradient-to-r from-blue-50 via-violet-100/80 to-fuchsia-50 text-violet-800 shadow-sm"
                  : "text-slate-600"
              }`}
              onClick={() => navigate(item.path)}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
            >
              <Icon className={active ? "text-violet-600" : "text-slate-400"} />
              <span className="hidden md:inline">{item.label}</span>
            </Button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1.5 border-t border-violet-100 pt-4">
        <Button
          variant="ghost"
          className="w-full justify-center px-3 text-slate-600 md:justify-start"
          onClick={() => navigate("/settings")}
          aria-current={isActive("/settings") ? "page" : undefined}
          aria-label="Profile & settings"
        >
          <Settings className="text-slate-400" />
          <span className="hidden md:inline">Profile & settings</span>
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-center px-3 text-slate-600 md:justify-start"
          onClick={() => navigate("/")}
          aria-label="View home"
        >
          <Home className="text-slate-400" />
          <span className="hidden md:inline">View home</span>
        </Button>
      </div>
    </aside>
  );
};

export default Navigation;
