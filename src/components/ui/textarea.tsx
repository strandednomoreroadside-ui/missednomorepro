import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-20 w-full rounded-lg border border-input bg-night/60 px-3 py-2 text-sm text-foreground shadow-sm transition-colors",
      "placeholder:text-steel/60",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-cyan/50",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
