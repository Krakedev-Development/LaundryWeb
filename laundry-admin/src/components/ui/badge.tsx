/* eslint-disable react-refresh/only-export-components -- variantes compartidas estilo shadcn/ui */
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary-dark',
        secondary: 'border-transparent bg-primary-soft text-primary hover:bg-primary/10',
        destructive: 'border-transparent bg-primary-dark text-primary-foreground shadow hover:bg-primary',
        outline: 'border-border bg-surface text-text',
        success: 'border-transparent bg-accent text-text shadow hover:bg-accent-dark',
        warning: 'border-transparent bg-aqua text-primary-dark shadow hover:bg-aqua/85',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
