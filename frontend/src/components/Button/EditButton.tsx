import React from 'react';
import { Edit3 } from 'lucide-react';

interface EditButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text' | 'full' | 'outline' | 'ghost';
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

export const EditButton: React.FC<EditButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
  className = '',
  size = 'md',
  variant = 'icon',
  children
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    icon: `text-blue-500 hover:text-blue-700 hover:bg-blue-50 ${iconSizeClasses[size]}`,
    text: `text-blue-600 hover:text-blue-800 ${sizeClasses[size]}`,
    full: `bg-blue-500 text-white hover:bg-blue-600 ${sizeClasses[size]}`,
    outline: `border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white ${sizeClasses[size]}`,
    ghost: `text-gray-600 hover:text-blue-600 hover:bg-gray-100 ${sizeClasses[size]}`
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      title="Edit"
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
      ) : (
        <>
          <Edit3 size={iconSizes[size]} />
          {(variant !== 'icon') && (
            <span className="ml-1">{children || 'Edit'}</span>
          )}
        </>
      )}
    </button>
  );
};

export default EditButton;
