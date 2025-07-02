import React from "react";
import { Eye } from "lucide-react";

interface ViewButtonProps {
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

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

export const ViewButton: React.FC<ViewButtonProps> = ({
  onClick,
  className = "",
  size = "sm",
  title = "View Details"
}) => {
  const baseClasses = "inline-flex items-center justify-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors duration-200";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${iconSizeClasses[size]} ${className}`}
      title={title}
    >
      <Eye size={iconSizes[size]} />
    </button>
  );
};

export default ViewButton;
