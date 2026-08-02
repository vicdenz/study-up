import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps extends HTMLAttributes<HTMLElement> {
  actions?: ReactNode;
  actionsClassName?: string;
  transparent?: boolean;
}

const PageHeader = ({
  actions,
  actionsClassName,
  children,
  className,
  transparent = false,
  ...props
}: PageHeaderProps) => (
  <header
    className={cn(
      "app-page-header",
      transparent && "app-page-header--transparent",
      className,
    )}
    {...props}
  >
    <div className="app-page-header-content">
      {children}
      {actions ? (
        <div className={cn("app-page-header-actions", actionsClassName)}>
          {actions}
        </div>
      ) : null}
    </div>
  </header>
);

export default PageHeader;
