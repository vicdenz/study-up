import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, LogOut, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "@/lib/router";
import { useProfile } from "@/hooks/useProfile";

const UserMenu = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { profile, user } = useProfile();
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
  const initials = name
    ? name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()
    : (user?.email?.[0] ?? "U").toUpperCase();

  const handleLogout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) toast.error(error.message);
      else {
        toast.success("Successfully logged out");
        navigate("/auth");
      }
    } catch {
      toast.error("An error occurred while logging out");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full p-0" aria-label="Open user menu">
          <Avatar className="h-9 w-9 border-2 border-white shadow-sm ring-1 ring-violet-200">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt={name || "User"} />
            <AvatarFallback className="bg-gradient-to-br from-blue-100 via-violet-100 to-fuchsia-100 text-sm font-semibold text-violet-700">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="px-2.5 py-2 font-normal">
          <span className="block truncate font-semibold text-slate-900">{name || "StudyUp student"}</span>
          <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/settings")}>
          <Settings className="mr-2" />
          Profile & settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/")}>
          <Home className="mr-2" />
          View home
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} disabled={loading} className="text-red-600 focus:text-red-700">
          <LogOut className="mr-2" />
          {loading ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
