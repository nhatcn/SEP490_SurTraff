import React, { useState } from 'react';

interface AuthInputProps {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  disabled?: boolean;
  error?: string;
}

const AuthInput: React.FC<AuthInputProps> = ({
  id,
  type,
  label,
  placeholder,
  value,
  onChange,
  icon,
  disabled = false,
  error,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';
  const inputType = isPasswordField ? (showPassword ? 'text' : 'password') : type;

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const EyeIcon = () => (
    <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  );

  const EyeSlashIcon = () => (
    <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
    </svg>
  );

  return (
    <div>
      <label htmlFor={id} className="block text-white text-sm mb-2">{label}</label>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
          {icon}
        </span>
        <input
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full py-2 pl-10 ${isPasswordField ? 'pr-10' : 'pr-4'} rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2
            ${error ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            disabled={disabled}
            className="absolute inset-y-0 right-0 flex items-center pr-3 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default AuthInput;