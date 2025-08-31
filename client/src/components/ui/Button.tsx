/**
 * Button Component
 * 
 * Premium button component with Koda design system styling.
 */

import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-500 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transform hover:scale-[1.01] active:scale-[0.99]';
  
  const variants = {
    primary: 'bg-gradient-to-r from-koda-primary to-koda-primary-dark hover:from-koda-primary hover:to-koda-primary hover:bg-gradient-to-br text-white shadow-button hover:shadow-card focus:ring-koda-primary/30 active:shadow-button-hover border border-koda-primary-dark/20 hover:brightness-110',
    secondary: 'bg-surface hover:bg-surface-elevated text-text-primary border border-border hover:border-koda-primary/30 shadow-subtle hover:shadow-card focus:ring-koda-primary/20 hover:text-koda-primary',
    outline: 'border-2 border-koda-primary/30 text-koda-primary hover:bg-koda-primary/5 hover:border-koda-primary focus:ring-koda-primary/20 active:bg-koda-primary/10 shadow-subtle hover:shadow-card',
    ghost: 'text-text-secondary hover:text-koda-primary hover:bg-koda-primary/5 focus:ring-koda-primary/20 rounded-lg hover:rounded-xl',
    danger: 'bg-gradient-to-r from-error to-red-600 hover:from-red-600 hover:to-error text-white shadow-button hover:shadow-card focus:ring-error/30 border border-red-700/20',
  };
  
  const sizes = {
    sm: 'px-4 py-3 text-sm min-h-[44px] min-w-[88px]', // Mobile-optimized touch target
    md: 'px-6 py-3.5 text-base min-h-[48px] min-w-[112px]', // Enhanced mobile touch target
    lg: 'px-8 py-4 text-lg min-h-[56px] min-w-[128px]', // Larger mobile touch target
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;