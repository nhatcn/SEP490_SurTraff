import React from 'react';
import { Plus } from 'lucide-react';

interface AddButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text' | 'full' | 'outline' | 'ghost';
  text?: string;
  children?: React.ReactNode;
}

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base'
};

const iconSizeClasses = {
  sm: 'p-1',
  md: 'p-2',
  lg: 'p-3'
};

const iconSizes = {
  sm: 14,
  md: 18,
  lg: 22
};

export const AddButton: React.FC<AddButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
  className = '',
  size = 'md',
  variant = 'full',
  text = 'Add',
  children
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    icon: `text-green-500 hover:text-green-700 hover:bg-green-50 ${iconSizeClasses[size]}`,
    text: `text-green-600 hover:text-green-800 ${sizeClasses[size]}`,
    full: `bg-blue-500 text-white hover:bg-blue-700 ${sizeClasses[size]}`,
    outline: `border border-green-500 text-green-500 hover:bg-green-500 hover:text-white ${sizeClasses[size]}`,
    ghost: `text-gray-600 hover:text-green-600 hover:bg-gray-100 ${sizeClasses[size]}`
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      title="Add"
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
      ) : (
        <>
          <Plus size={iconSizes[size]} />
          {(variant !== 'icon') && (
            <span className="ml-1">{children || text}</span>
          )}
        </>
      )}
    </button>
  );
};

export default AddButton;