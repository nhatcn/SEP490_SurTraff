import React from 'react';

interface AuthInputProps {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  disabled?: boolean; // Thêm dòng này
}

const AuthInput: React.FC<AuthInputProps> = ({
  id,
  type,
  label,
  placeholder,
  value,
  onChange,
  icon,
  disabled = false, // Và thêm mặc định ở đây
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
          disabled={disabled} // Thêm vào đây
          className="w-full py-2 pl-10 pr-4 bg-white/20 text-white placeholder-white/70 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>
    </div>
  );
};

export default AuthInput;
