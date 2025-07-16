// pages/Auth/RegisterPage.tsx
import React, { useState } from 'react';
import AuthLayout from '../../components/Auth/AuthLayout';
import AuthInput from '../../components/Auth/AuthInput';
import AuthButton from '../../components/Auth/AuthButton';
import { useRegister } from '../../hooks/Auth/useAuth';
import { RegisterFormData } from '../../types/Auth/auth';
import Logo from '../../components/Logo/Logo';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    fullName: '',
    password: '',
    confirmPassword: ''
  });

  const { isLoading, error, register } = useRegister();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register(formData);
  };

  const handleInputChange = (field: keyof RegisterFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const UserIcon = () => (
    <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  );

  const NameIcon = () => (
    <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.35-.035-.691-.1-1.021A5 5 0 0010 11z" clipRule="evenodd" />
    </svg>
  );

  const LockIcon = () => (
    <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
    </svg>
  );

  return (
    <AuthLayout title="">      
    <div className="flex justify-center mb-8">
        <Logo />
      </div>

      {/* Welcome Text */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
        <p className="text-white/70">Join us today and get started</p>
      </div>

      
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          id="username"
          type="text"
          label="Username"
          placeholder="Choose a username"
          value={formData.username}
          onChange={handleInputChange('username')}
          icon={<UserIcon />}
          disabled={isLoading}
        />

        <AuthInput
          id="fullName"
          type="text"
          label="Full Name"
          placeholder="Enter your full name"
          value={formData.fullName}
          onChange={handleInputChange('fullName')}
          icon={<NameIcon />}
          disabled={isLoading}
        />

        <AuthInput
          id="password"
          type="password"
          label="Password"
          placeholder="Create a password"
          value={formData.password}
          onChange={handleInputChange('password')}
          icon={<LockIcon />}
          disabled={isLoading}
        />

        <AuthInput
          id="confirmPassword"
          type="password"
          label="Confirm Password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleInputChange('confirmPassword')}
          icon={<LockIcon />}
          disabled={isLoading}
        />

        <AuthButton type="submit" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </AuthButton>
      </form>

      <div className="text-center mt-6">
        <p className="text-white">
          Already have an account?{' '}
          <a href="/login" className="text-blue-400 hover:text-blue-300">
            Login
          </a>
        </p>
      </div>
    </AuthLayout>
  );
};

export default RegisterPage;