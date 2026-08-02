import { ArrowRight, CheckCircle2, LayoutDashboard } from "lucide-react";
import ActionButton from "@/components/ActionButton";
import Brand from "@/components/Brand";
import PageHeader from "@/components/PageHeader";
import UserMenu from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@/lib/router";

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const destination = user ? "/dashboard" : "/auth?mode=signup";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-blue-50 via-white to-fuchsia-50">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8b5cf60c_1px,transparent_1px),linear-gradient(to_bottom,#8b5cf60c_1px,transparent_1px)] bg-[size:24px_24px]" />

      <PageHeader
        transparent
        actions={user ? (
          <>
            <ActionButton icon={LayoutDashboard} onClick={() => navigate("/dashboard")}>Dashboard</ActionButton>
            <UserMenu />
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={() => navigate("/auth")}>Log in</Button>
            <Button variant="gradient" onClick={() => navigate("/auth?mode=signup")}>Get started</Button>
          </>
        )}
      >
        <Brand />
      </PageHeader>

      <main className="container z-10 mx-auto grid flex-1 items-center gap-12 px-6 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-20">
        <div className="max-w-2xl">
          <p className="mb-5 text-sm font-semibold text-violet-700">Your personalized learning workspace</p>
          <h1 className="text-[clamp(2.75rem,6vw,5rem)] font-bold leading-[0.98] tracking-tight text-slate-950">
            Turn your coursework into <span className="text-gradient">clarity.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 md:text-lg">
            Keep courses, assignments, notes, and study materials together—then use an AI tutor that understands the context you are working in.
          </p>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Button variant="gradient" size="lg" onClick={() => navigate(destination)}>
              {user ? "Open your dashboard" : "Start studying for free"}<ArrowRight />
            </Button>
            <div className="flex items-center gap-2 text-sm text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Built for focused study</div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-4xl">
          <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-blue-300 via-violet-300 to-fuchsia-300 opacity-30 blur-2xl" />
          <div className="relative overflow-hidden rounded-3xl border border-white bg-white p-2 shadow-2xl shadow-violet-900/10">
            <img src="/studyup-dashboard.png" alt="StudyUp dashboard showing courses and upcoming work" className="w-full rounded-xl" />
          </div>
        </div>
      </main>

      <footer className="container z-10 mx-auto flex items-center justify-between border-t border-violet-100 px-6 py-8 text-sm text-slate-500">
        <Brand compact />
        <span>Plan less. Learn more.</span>
      </footer>
    </div>
  );
};

export default LandingPage;
