import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import Brand from "@/components/Brand";
import UserMenu from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "@/lib/router";

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const destination = user ? "/dashboard" : "/auth";

  return (
    <div className="app-background relative flex min-h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8b5cf60c_1px,transparent_1px),linear-gradient(to_bottom,#8b5cf60c_1px,transparent_1px)] bg-[size:24px_24px]" />

      <header className="container z-10 mx-auto flex items-center justify-between px-6 py-5">
        <Brand />
        <div className="flex items-center gap-2 md:gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-slate-600 sm:inline">
                Welcome back{profile?.first_name ? `, ${profile.first_name}` : ""}
              </span>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>Dashboard</Button>
              <UserMenu />
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => navigate("/auth")}>Log in</Button>
              <Button onClick={() => navigate("/auth")}>Get started</Button>
            </>
          )}
        </div>
      </header>

      <main className="container z-10 mx-auto flex flex-1 flex-col px-6 pt-14 md:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/70 px-4 py-2 text-sm font-medium text-violet-700 shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4" /> Your personalized learning workspace
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-950 md:text-7xl">
            Turn your coursework into <span className="text-gradient">clarity.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            Keep courses, assignments, notes, and study materials together—then use an AI tutor that understands the context you are working in.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={() => navigate(destination)}>
              {user ? "Open your dashboard" : "Start studying for free"}<ArrowRight />
            </Button>
            <div className="flex items-center gap-2 px-3 text-sm text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Built for focused study</div>
          </div>
        </div>

        <div className="relative mx-auto mt-16 w-full max-w-6xl md:mt-24">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-blue-400 via-violet-500 to-fuchsia-500 opacity-25 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-white p-2 shadow-2xl shadow-violet-900/15">
            <img src="/studyup-dashboard.png" alt="StudyUp dashboard showing courses and upcoming work" className="w-full rounded-xl" />
          </div>
        </div>
      </main>

      <footer className="container z-10 mx-auto mt-20 flex items-center justify-between border-t border-violet-100 px-6 py-8 text-sm text-slate-500">
        <Brand compact />
        <span>Plan less. Learn more.</span>
      </footer>
    </div>
  );
};

export default LandingPage;
