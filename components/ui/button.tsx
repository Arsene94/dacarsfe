import * as React from 'react';

import { cn } from '@/lib/utils';
import { ButtonProps } from '@/types/ui';

type ButtonRef = HTMLElement;

const Button = React.forwardRef<ButtonRef, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      asChild = false,
      children,
      type,
      ...props
    },
    ref
  ) => {
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

    const { ['aria-label']: ariaLabelProp, ...rest } = props;
    const ariaLabel =
      ariaLabelProp ?? (typeof children === 'string' ? children : undefined);

    const baseClassName = cn(
      'inline-flex items-center justify-center font-dm-sans font-semibold rounded-lg transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60',
      sizeClasses,
      variantClasses,
      className
    );

    if (asChild && React.isValidElement(children)) {
      const child = React.Children.only(children);
      const childClassName = (child.props as { className?: string }).className;
      const existingRef =
        (child as React.ReactElement & { ref?: React.Ref<ButtonRef> }).ref;
      const safeChildRef =
        typeof existingRef === 'string' ? undefined : existingRef;
      const mergedRef = composeRefs<ButtonRef>(
        ref as React.Ref<ButtonRef>,
        safeChildRef
      );

      const childProps: Record<string, unknown> = {
        ...rest,
        className: cn(baseClassName, childClassName),
      };

      if (ariaLabel) {
        childProps['aria-label'] = ariaLabel;
      }

      if (mergedRef) {
        (childProps as { ref?: React.Ref<ButtonRef> }).ref = mergedRef;
      }

      return React.cloneElement(child, childProps);
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        type={type ?? 'button'}
        {...rest}
        className={baseClassName}
        aria-label={ariaLabel}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };

function composeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): ((instance: T | null) => void) | undefined {
  const validRefs = refs.filter(Boolean) as React.Ref<T>[];

  if (validRefs.length === 0) {
    return undefined;
  }

  return (node: T | null) => {
    for (const ref of validRefs) {
      if (typeof ref === 'function') {
        ref(node);
        continue;
      }

      (ref as React.MutableRefObject<T | null>).current = node;
    }
  };
}
