
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "@/lib/router";
import AuthWrapper from "@/components/AuthWrapper";
import NetworkStatus from "@/components/NetworkStatus";

const AITutor = lazy(() => import("./pages/AITutor"));
const AssignmentPage = lazy(() => import("./pages/AssignmentPage"));
const Auth = lazy(() => import("./pages/Auth"));
const CoursePage = lazy(() => import("./pages/CoursePage"));
const Courses = lazy(() => import("./pages/Courses"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Notebook = lazy(() => import("./pages/Notebook"));
const NoteEditor = lazy(() => import("./pages/NoteEditor"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Planner = lazy(() => import("./pages/Planner"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const Upload = lazy(() => import("./pages/Upload"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const RouteFallback = () => (
  <div
    className="flex min-h-screen items-center justify-center bg-gray-50"
    role="status"
    aria-live="polite"
  >
    <span className="sr-only">Loading page</span>
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <NetworkStatus />
      <Toaster />
      <Sonner />
      <AuthWrapper>
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <Route path="/auth"><Auth /></Route>
            <Route path="/"><LandingPage /></Route>
            <Route path="/dashboard"><Dashboard /></Route>
            <Route path="/courses"><Courses /></Route>
            <Route path="/courses/:courseId"><CoursePage /></Route>
            <Route path="/courses/:courseId/assignments/:assignmentId"><AssignmentPage /></Route>
            <Route path="/notebook"><Notebook /></Route>
            <Route path="/notebook/note/:noteId"><NoteEditor /></Route>
            <Route path="/planner"><Planner /></Route>
            <Route path="/upload"><Upload /></Route>
            <Route path="/ai-tutor"><AITutor /></Route>
            <Route path="/settings"><ProfileSettings /></Route>
            <Route><NotFound /></Route>
          </Switch>
        </Suspense>
      </AuthWrapper>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
