import React from 'react';

interface AuthButtonProps {
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const AuthButton: React.FC<AuthButtonProps> = ({
  type = 'button',
  onClick,
  fullWidth = true,
  children
}) => {
  return (
    <button 
      type={type}
      onClick={onClick}
      className={`
        ${fullWidth ? 'w-full' : ''} 
        bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors
      `}
    >
      {children}
    </button>
  );
};

export default AuthButton;