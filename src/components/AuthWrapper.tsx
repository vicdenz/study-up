
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useNavigate, useLocation } from "@/lib/router";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext } from "@/hooks/useAuth";

interface AuthWrapperProps {
  children: React.ReactNode;
}

const AuthWrapper = ({ children }: AuthWrapperProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const previousUserId = useRef<string | null | undefined>(undefined);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const nextUser = session?.user ?? null;

        if (
          previousUserId.current !== undefined &&
          previousUserId.current !== nextUser?.id
        ) {
          queryClient.clear();
        }

        previousUserId.current = nextUser?.id ?? null;
        setUser(nextUser);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      const nextUser = session?.user ?? null;
      previousUserId.current = nextUser?.id ?? null;
      setUser(nextUser);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  useEffect(() => {
    if (!loading) {
      const publicPaths = ["/auth", "/"];
      if (!user && !publicPaths.includes(location.pathname)) {
        navigate("/auth", { replace: true });
      } else if (user && location.pathname === "/auth") {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, loading, navigate, location.pathname]);

  const publicPaths = ["/auth", "/"];
  const redirecting =
    (!user && !publicPaths.includes(location.pathname)) ||
    (user && location.pathname === "/auth");

  if (loading || redirecting) {
    return (
      <div
        className="app-background min-h-screen flex items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthWrapper;
