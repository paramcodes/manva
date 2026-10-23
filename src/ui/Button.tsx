import React from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
          {
            'bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-950 active:scale-[0.98]':
              variant === 'primary',
            'bg-zinc-800 text-zinc-100 hover:bg-zinc-700/80 border border-zinc-700/60 active:scale-[0.98]':
              variant === 'secondary',
            'bg-transparent hover:bg-zinc-800/80 text-zinc-300 hover:text-zinc-100':
              variant === 'ghost',
            'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30':
              variant === 'danger',
            'border border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900':
              variant === 'outline',
          },
          {
            'h-7 px-2.5 text-xs rounded-md gap-1.5': size === 'sm',
            'h-9 px-3.5 text-sm rounded-lg gap-2': size === 'md',
            'h-11 px-5 text-base rounded-xl gap-2.5': size === 'lg',
            'h-8 w-8 p-0 rounded-md': size === 'icon',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
