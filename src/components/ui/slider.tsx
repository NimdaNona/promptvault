import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onValueChange?: (value: number) => void;
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, min = 0, max = 100, step = 1, value, onChange, onValueChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      onChange?.(e);
      onValueChange?.(newValue);
    };

    return (
      <div className="relative">
        <input
          type="range"
          ref={ref}
          className={cn(
            "w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:w-5",
            "[&::-webkit-slider-thumb]:h-5",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-blue-600",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:transition-all",
            "[&::-webkit-slider-thumb]:hover:bg-blue-700",
            "[&::-webkit-slider-thumb]:hover:scale-110",
            "[&::-moz-range-thumb]:w-5",
            "[&::-moz-range-thumb]:h-5",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:bg-blue-600",
            "[&::-moz-range-thumb]:cursor-pointer",
            "[&::-moz-range-thumb]:transition-all",
            "[&::-moz-range-thumb]:hover:bg-blue-700",
            "[&::-moz-range-thumb]:hover:scale-110",
            "[&::-moz-range-thumb]:border-0",
            "[&::-webkit-slider-runnable-track]:rounded-lg",
            "[&::-moz-range-track]:rounded-lg",
            "focus:outline-none",
            "focus:ring-2",
            "focus:ring-blue-500",
            "focus:ring-offset-2",
            "disabled:opacity-50",
            "disabled:cursor-not-allowed",
            className
          )}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          {...props}
        />
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };