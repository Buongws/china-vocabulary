import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva('button', { variants: { variant: { default: 'primary', secondary: 'secondary', outline: 'outline', ghost: 'ghost', destructive: 'danger' }, size: { default: '', sm: 'small', icon: 'icon-button' } }, defaultVariants: { variant: 'default', size: 'default' } });
function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button';
  return <Component data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
export { Button, buttonVariants };
