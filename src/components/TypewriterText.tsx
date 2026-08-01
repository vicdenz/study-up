import { ReactNode, useEffect, useState } from "react";

interface TypewriterTextProps {
  text: string;
  animate?: boolean;
  intervalMs?: number;
  children: (visibleText: string) => ReactNode;
}

const TypewriterText = ({ text, animate = true, intervalMs = 12, children }: TypewriterTextProps) => {
  const reduceMotion = typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shouldAnimate = animate && !reduceMotion;
  const [visibleLength, setVisibleLength] = useState(shouldAnimate ? 0 : text.length);

  useEffect(() => {
    if (!shouldAnimate) {
      setVisibleLength(text.length);
      return;
    }

    setVisibleLength(0);
    const chunkSize = Math.max(1, Math.ceil(text.length / 180));
    const timer = window.setInterval(() => {
      setVisibleLength((length) => {
        const nextLength = Math.min(text.length, length + chunkSize);
        if (nextLength === text.length) window.clearInterval(timer);
        return nextLength;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, shouldAnimate, text]);

  return <>{children(text.slice(0, visibleLength))}</>;
};

export default TypewriterText;
