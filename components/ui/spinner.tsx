import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const spinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      default: 'size-5',
      sm: 'size-4',
      lg: 'size-6',
      icon: 'size-7'
    }
  },
  defaultVariants: {
    size: 'default'
  }
})

export interface SpinnerProps
  extends React.SVGAttributes<SVGSVGElement>,
    VariantProps<typeof spinnerVariants> {}

const Spinner = React.forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        {...props}
        fill='none'
        width='20'
        height='20'
        viewBox='0 0 24 24'
        strokeWidth='1.5'
        stroke='currentColor'
        strokeLinecap='round'
        strokeLinejoin='round'
        xmlns='http://www.w3.org/2000/svg'
        className={cn(spinnerVariants({ size, className }))}
      >
        <path d='M12 2v4' style={{ opacity: 0.3 }} />
        <path d='m16.2 7.8 2.9-2.9' style={{ opacity: 0.4 }} />
        <path d='M18 12h4' style={{ opacity: 0.5 }} />
        <path d='m16.2 16.2 2.9 2.9' style={{ opacity: 0.6 }} />
        <path d='M12 18v4' style={{ opacity: 0.7 }} />
        <path d='m4.9 19.1 2.9-2.9' style={{ opacity: 0.8 }} />
        <path d='M2 12h4' style={{ opacity: 0.9 }} />
        <path d='m4.9 4.9 2.9 2.9' style={{ opacity: 1 }} />
      </svg>
    )
  }
)

Spinner.displayName = 'Spinner'
export { Spinner, spinnerVariants }
