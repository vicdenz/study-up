import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export interface ActionButtonProps extends ButtonProps {
  icon: LucideIcon;
}

const ActionButton = React.forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ children, icon: Icon, type = "button", ...props }, ref) => (
    <Button ref={ref} type={type} {...props}>
      <Icon aria-hidden="true" className="size-4" />
      {children}
    </Button>
  ),
);

ActionButton.displayName = "ActionButton";

export default ActionButton;
