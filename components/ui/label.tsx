import * as React from 'react';
import { cn } from '@/lib/utils';
import { LabelProps } from '@/types/ui';

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('block text-sm font-dm-sans font-semibold text-gray-700', className)}
    {...props}
  />
));

Label.displayName = 'Label';

export { Label };
