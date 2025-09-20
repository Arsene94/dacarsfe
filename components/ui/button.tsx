import * as React from 'react';
import { cn } from '@/lib/utils';
import { ButtonProps } from '@/types/ui';

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const variants = {
      default: 'bg-jade text-white hover:bg-jadeLight',
      secondary: 'bg-berkeley text-white hover:bg-berkeley/90',
      outline: 'border-2 bg-jade text-white hover:bg-jadeLight',
      danger: 'border-2 bg-red-500 text-white hover:bg-red-600',
      blue: 'border-2 bg-blue-400 text-white hover:bg-blue-500',
      yellow: 'border-2 bg-yellow-400 text-white hover:bg-yellow-600',
    } as const;

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-8 py-4 text-base',
      lg: 'px-10 py-5 text-lg',
    } as const;

    const variantClasses = variants[variant] ?? variants.default;
    const sizeClasses = sizes[size] ?? sizes.md;

    const { ['aria-label']: ariaLabel, ...rest } = props;

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-dm-sans font-semibold rounded-lg transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60',
          sizeClasses,
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
