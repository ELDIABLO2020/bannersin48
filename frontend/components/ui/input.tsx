import * as React from "react";
import { cn } from "@/lib/utils/cn";

type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  inputSize?: InputSize;
  invalid?: boolean;
}

const sizeClasses = {
  sm: "h-9 text-sm",
  md: "h-10 text-sm",
  lg: "h-12 text-base",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = "md", invalid, ...props }, ref) => {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full bg-surface text-ink placeholder:text-ink-muted",
          "rounded-pill border border-line-input px-md",
          "focus:outline-none focus:border-link focus:shadow-focus",
          "disabled:bg-surface-tint disabled:text-ink-muted disabled:cursor-not-allowed",
          sizeClasses[inputSize],
          invalid && "border-danger focus:border-danger focus:shadow-none",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
