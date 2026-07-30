
import { Button } from "@/components/ui/button";
import { Brain, Linkedin, Github, X } from "lucide-react";
import { Link, useNavigate } from "@/lib/router";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-foreground flex flex-col min-h-screen">
      <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>

      <header className="container mx-auto px-6 py-4 flex justify-between items-center z-10">
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">StudyUp</span>
        </Link>
        <div className="flex items-center space-x-2 md:space-x-4">
          <Button variant="ghost" onClick={() => navigate('/auth')}>
            Login
          </Button>
          <Button onClick={() => navigate('/auth')} variant="default">
            Get Started for Free
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 flex-grow flex flex-col pt-16 md:pt-24 z-10">
        <div className="max-w-3xl">
          <h1 className="text-[40px] leading-[44px] font-medium tracking-[-.06rem] bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70 py-2">
            Unlock Your Academic Potential
          </h1>
          <p className="mt-4 text-sm md:text-base text-muted-foreground">
            StudyUp is the all-in-one academic planner and AI tutor. Organize your schedule, manage assignments, and get instant help.
          </p>
          <div className="mt-8 mb-5">
            <Button size="lg" onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2">
              Try it Out
            </Button>
          </div>
        </div>

        <div className="relative mt-8 md:mt-16 w-full">
          <div className="absolute -inset-2 rounded-xl bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 opacity-20 blur-2xl"></div>
          <img 
            src="/lovable-uploads/8321a47f-6fa8-4086-870a-1b76b48edcb3.png" 
            alt="StudyUp application screenshot" 
            className="relative rounded-lg shadow-2xl ring-1 ring-black/10 dark:ring-white/10"
          />
        </div>
      </main>

      <footer className="container mx-auto px-6 py-8 mt-16 md:mt-24 flex justify-between items-center text-muted-foreground text-sm z-10">
        <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
        </div>
        <div className="flex items-center space-x-4">
            <a aria-label="LinkedIn" href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                <Linkedin className="h-5 w-5" />
            </a>
            <a aria-label="X" href="https://x.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
            </a>
            <a aria-label="GitHub" href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                <Github className="h-5 w-5" />
            </a>
        </div>
    </footer>
    </div>
  );
};

export default LandingPage;
