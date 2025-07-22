import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default:
        "border-transparent bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
      secondary:
        "border-transparent bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100",
      destructive:
        "border-transparent bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100",
      outline: "text-gray-950 dark:text-gray-50",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 dark:border-gray-800 dark:focus:ring-gray-300",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };