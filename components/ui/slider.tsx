import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  max: number
  min?: number
  step?: number
  className?: string
  disabled?: boolean
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value, onValueChange, max, min = 0, step = 1, disabled = false, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(e.target.value, 10)
      console.log('Slider value changed:', newValue) // Debug log
      onValueChange([newValue])
    }

    const currentValue = value[0] !== undefined ? value[0] : min

    return (
      <div
        ref={ref}
        className={cn("relative flex w-full items-center", className)}
        {...props}
      >
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            "w-full h-2 bg-gray-200 rounded-lg cursor-pointer",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        />
        {/* Debug info */}
        <span className="absolute -bottom-6 left-0 text-xs text-gray-400">
          {currentValue}/{max}
        </span>
      </div>
    )
  }
)

Slider.displayName = "Slider"

export { Slider } 