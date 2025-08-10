import React from 'react';

interface AuthButtonProps {
  children: React.ReactNode;
  type: 'button' | 'submit' | 'reset';
  disabled?: boolean; // Thêm dòng này
}

const AuthButton: React.FC<AuthButtonProps> = ({ children, type, disabled = false }) => {
  return (
    <button
      type={type}
      disabled={disabled} // Thêm vào đây
      className={`w-full py-2 px-4 rounded-lg font-semibold transition duration-200 ${
        disabled
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-blue-500 hover:bg-blue-600 text-white'
      }`}
    >
      {children}
    </button>
  );
};

export default AuthButton;
