import * as React from "react"

import { cn } from "@/lib/utils"

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number[]
  onValueChange?: (value: number[]) => void
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value, onValueChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = [parseInt(e.target.value)];
      onValueChange?.(newValue);
    };

    return (
      <div className="relative flex w-full touch-none select-none items-center">
        <input
          type="range"
          className={cn(
            "relative h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 outline-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer",
            className
          )}
          value={value?.[0] || props.defaultValue || 0}
          onChange={handleChange}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
