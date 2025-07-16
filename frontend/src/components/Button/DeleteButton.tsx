import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text' | 'full';
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

export const DeleteButton: React.FC<DeleteButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
  className = '',
  size = 'md',
  variant = 'icon',
  children
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    icon: `text-red-500 hover:text-red-700 hover:bg-red-50 ${iconSizeClasses[size]}`,
    text: `text-red-600 hover:text-red-800 ${sizeClasses[size]}`,
    full: `bg-red-500 text-gray-50 hover:bg-red-600 ${sizeClasses[size]}`
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      title="Delete"
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
      ) : (
        <>
          <Trash2 size={iconSizes[size]} />
          {(variant === 'text' || variant === 'full') && (
            <span className="ml-1">{children || 'Delete'}</span>
          )}

        </>
      )}

    </button>
  );
};

export default DeleteButton;

