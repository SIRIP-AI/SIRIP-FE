import { Popover as PopoverPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils.js'

function Popover(props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger(props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({ className, align = 'end', sideOffset = 8, ...props }) {
  return <PopoverPrimitive.Portal><PopoverPrimitive.Content align={align} sideOffset={sideOffset} className={cn('z-50 w-80 rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none', className)} data-slot="popover-content" {...props} /></PopoverPrimitive.Portal>
}

export { Popover, PopoverContent, PopoverTrigger }
