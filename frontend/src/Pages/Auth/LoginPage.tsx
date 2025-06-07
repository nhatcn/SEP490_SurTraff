// pages/Auth/LoginPage.tsx
import React, { useState } from 'react';
import AuthLayout from '../../components/Auth/AuthLayout';
import AuthInput from '../../components/Auth/AuthInput';
import AuthButton from '../../components/Auth/AuthButton';
import { useLogin, useGoogleAuth } from '../../hooks/Auth/useAuth';
import { LoginFormData } from '../../types/Auth/auth';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    rememberMe: false
  });
  
  const { isLoading, error, login } = useLogin();
  const { handleGoogleLogin } = useGoogleAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(formData);
  };

  const handleInputChange = (field: keyof LoginFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const UserIcon = () => (
    <svg
      className="h-4 w-4 text-gray-400"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
        clipRule="evenodd"
      />
    </svg>
  );

  const LockIcon = () => (
    <svg
      className="h-4 w-4 text-gray-400"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  );

  return (
    <AuthLayout title="Login">
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center bg-white py-2 rounded-lg hover:bg-gray-100 transition-colors"
        disabled={isLoading}
      >
        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span className="text-gray-800 font-medium">Login with Google</span>
      </button>

      <div className="flex items-center my-4">
        <div className="flex-1 border-t border-gray-300/30"></div>
        <div className="px-4 text-sm text-white/70">OR</div>
        <div className="flex-1 border-t border-gray-300/30"></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          id="username"
          type="text"
          label="Username"
          placeholder="Enter your username"
          value={formData.username}
          onChange={handleInputChange('username')}
          icon={<UserIcon />}
          disabled={isLoading}
        />

        <AuthInput
          id="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleInputChange('password')}
          icon={<LockIcon />}
          disabled={isLoading}
        />

        <div className="flex justify-between items-center">
          <a
            href="/forgotpassword"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Forgot password?
          </a>
        </div>

        <AuthButton type="submit" disabled={isLoading}>
          {isLoading ? 'Signing In...' : 'Sign In'}
        </AuthButton>
      </form>

      <div className="text-center mt-6">
        <p className="text-white">
          Don't have an account?{' '}
          <a
            href="/register"
            className="text-blue-400 hover:text-blue-300"
          >
            Register
          </a>
        </p>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;