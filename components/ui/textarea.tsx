import * as React from "react";
import { cn } from "@/lib/utils";
import type { TextareaProps } from "@/types/ui";

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "block w-full max-w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 font-dm-sans text-[#191919] shadow-sm transition placeholder:text-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-jade focus:shadow-md",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";

export { Textarea };
