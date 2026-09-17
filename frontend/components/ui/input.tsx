import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full bg-surface text-ink placeholder:text-ink-muted font-input",
          "focus:outline-none focus:border-link focus:shadow-focus",
          "disabled:bg-surface-tint disabled:text-ink-muted disabled:cursor-not-allowed",
          "h-10 text-sm rounded-btn border border-line-input px-md",
          invalid && "border-danger focus:border-danger focus:shadow-none",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
