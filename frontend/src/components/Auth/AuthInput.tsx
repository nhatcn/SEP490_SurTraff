import React from 'react';

interface AuthInputProps {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  disabled?: boolean;
  error?: string; // ✅ Thêm prop lỗi
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
  error, // ✅ Nhận prop lỗi
}) => {
  return (
    <div>
      <label htmlFor={id} className="block text-white text-sm mb-2">{label}</label>
      <div className="relative">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
          {icon}
        </span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full py-2 pl-10 pr-4 rounded-lg bg-white/20 text-white placeholder-white/70 focus:outline-none focus:ring-2
            ${error ? 'border border-red-500 focus:ring-red-500' : 'focus:ring-blue-500'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default AuthInput;
