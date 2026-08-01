import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";

interface BrandProps {
  compact?: boolean;
  className?: string;
}

const Brand = ({ compact = false, className }: BrandProps) => (
  <Link
    to="/"
    aria-label="StudyUp home"
    className={cn(
      "group inline-flex items-center gap-3 rounded-xl outline-none transition-transform duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      className,
    )}
  >
    <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/20">
      <img src="/studyup-logo.svg" alt="" className="h-8 w-8 brightness-0 invert" />
      <span className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />
    </span>
    {!compact && (
      <span className="text-xl font-bold tracking-tight text-foreground">
        Study<span className="text-gradient">Up</span>
      </span>
    )}
  </Link>
);

export default Brand;
