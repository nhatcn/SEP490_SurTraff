import React from 'react';
import { Check } from 'lucide-react';

interface SubmitButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'success' | 'outline';
  text?: string;
  type?: 'button' | 'submit';
  children?: React.ReactNode;
}

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base'
};

const iconSizes = {
  sm: 14,
  md: 18,
  lg: 22
};

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
  className = '',
  size = 'md',
  variant = 'primary',
  text = 'Submit',
  type = 'button',
  children
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: `bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 ${sizeClasses[size]}`,
    secondary: `bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 ${sizeClasses[size]}`,
    success: `bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 ${sizeClasses[size]}`,
    outline: `border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white focus:ring-blue-500 ${sizeClasses[size]}`
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
          Processing...
        </>
      ) : (
        <>
          <Check size={iconSizes[size]} className="mr-1" />
          {children || text}
        </>
      )}
    </button>
  );
};

export default SubmitButton;