import * as React from 'react';
import { cn } from '@/lib/utils';
import { ButtonProps } from '@/types/ui';

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
      const variants = {
          default: "bg-jade text-white",
          outline: "border-2 bg-jade text-white",
          danger: "border-2 bg-red-500 text-white",
          blue: "border-2 bg-blue-400 text-white",
      };

      const variantClasses = variants[variant] ?? "";

    const { ['aria-label']: ariaLabel, ...rest } = props as any;

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center px-8 py-4 font-sans font-semibold rounded-lg transition-all duration-300',
          variantClasses,
          className
        )}
        aria-label={ariaLabel ?? (typeof children === 'string' ? children : undefined)}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
