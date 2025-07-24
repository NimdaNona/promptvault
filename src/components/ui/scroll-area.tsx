import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal' | 'both';
}

const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, orientation = 'vertical', children, ...props }, ref) => {
    const scrollClass = cn(
      "relative overflow-auto",
      {
        "overflow-y-auto overflow-x-hidden": orientation === 'vertical',
        "overflow-x-auto overflow-y-hidden": orientation === 'horizontal',
        "overflow-auto": orientation === 'both',
      },
      "scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100",
      "dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800",
      "hover:scrollbar-thumb-gray-500 dark:hover:scrollbar-thumb-gray-500",
      className
    );

    return (
      <div
        ref={ref}
        className={scrollClass}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };