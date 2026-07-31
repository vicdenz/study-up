
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, Upload, MessageSquare } from "lucide-react";
import { useNavigate, useLocation } from "@/lib/router";
import { useProfile } from "@/hooks/useProfile";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, isLoading } = useProfile();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: BookOpen },
    { path: "/courses", label: "Courses", icon: BookOpen },
    { path: "/planner", label: "Planner", icon: Calendar },
    { path: "/notebook", label: "Notebook", icon: BookOpen },
    { path: "/upload", label: "Upload", icon: Upload },
    { path: "/ai-tutor", label: "AI Tutor", icon: MessageSquare },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const libraryName =
    !isLoading && profile?.first_name
      ? `${profile.first_name}'s Library`
      : "StudyUp";

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen p-6">
      <div className="flex items-center mb-8">
        <h1 className="text-xl font-semibold text-gray-900">{libraryName}</h1>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "default" : "ghost"}
              className={`w-full justify-start ${
                isActive(item.path) ? "font-medium" : ""
              }`}
              onClick={() => navigate(item.path)}
            >
              <Icon className="h-4 w-4 mr-3" />
              {item.label}
            </Button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Navigation;
