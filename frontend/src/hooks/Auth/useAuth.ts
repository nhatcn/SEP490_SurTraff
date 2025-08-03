// hooks/useAuth.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin, CredentialResponse } from '@react-oauth/google';
import axios from 'axios';
import {
  LoginFormData,
  RegisterFormData,
  ForgotPasswordFormData,
  AuthResponse,
  AuthError,
  AuthState
} from '../../types/Auth/auth';
import { setCookie } from '../../utils/cookieUltil';

const API_BASE_URL = 'http://localhost:8080/api/users';

export const useLogin = () => {
  const [state, setState] = useState<AuthState>({
    isLoading: false,
    error: ''
  });
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const navigate = useNavigate();

  const login = async (formData: LoginFormData) => {
    setFieldErrors({});
    setState({ isLoading: true, error: '' });

    const errors: { username?: string; password?: string } = {};
    if (!formData.username) errors.username = 'Username is required';
    if (!formData.password) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setState({ isLoading: false, error: '' });
      return;
    }

    try {
      const response = await axios.post<AuthResponse>(`${API_BASE_URL}/login`, {
        userName: formData.username,
        password: formData.password,
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      localStorage.setItem('token', response.data.token);
      setCookie('userId', response.data.userId);

      setState({ isLoading: false, error: '' });

      if (response.data.role === 'customer') {

        navigate('/home');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'An error occurred during login';
      setState({ isLoading: false, error: errorMessage });
    }
  };

  return {
    ...state,
    fieldErrors,
    login
  };
};

export const useRegister = () => {
  const [state, setState] = useState<AuthState>({
    isLoading: false,
    error: ''
  });
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; fullName?: string; password?: string; confirmPassword?: string }>({});
  const navigate = useNavigate();

  const register = async (formData: RegisterFormData) => {
    setState({ isLoading: true, error: '' });
    setFieldErrors({});

    const errors: typeof fieldErrors = {};
    if (!formData.username) errors.username = 'Username is required';
    if (!formData.fullName) errors.fullName = 'Full name is required';
    if (!formData.password) errors.password = 'Password is required';
    if (!formData.confirmPassword) errors.confirmPassword = 'Please confirm your password';
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setState({ isLoading: false, error: '' });
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/register`, {
        userName: formData.username,
        fullName: formData.fullName,
        password: formData.password,
      });

      setState({ isLoading: false, error: '' });
      navigate('/login');
    } catch (err: any) {
      const detail = err.response?.data?.error || err.response?.data?.detail;
      const errorMessage = typeof detail === 'string' ? detail : 'Registration failed.';
      setState({ isLoading: false, error: errorMessage });
    }
  };

  return {
    ...state,
    fieldErrors,
    register
  };
};


export const useForgotPassword = () => {
  const [state, setState] = useState<AuthState & { isSubmitted: boolean }>({
    isLoading: false,
    error: '',
    isSubmitted: false
  });

  const sendResetEmail = async (formData: ForgotPasswordFormData) => {
    setState(prev => ({ ...prev, isLoading: true, error: '' }));

    try {
      const response = await fetch(`${API_BASE_URL}/forgotPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        setState(prev => ({ ...prev, isLoading: false, isSubmitted: true }));
      } else {
        const data: AuthError = await response.json();
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: data.detail || 'Something went wrong.' 
        }));
      }
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Unable to send request. Please try again later.' 
      }));
    }
  };

  return {
    ...state,
    sendResetEmail
  };
};

export const useGoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogleLoginSuccess = async (credentialResponse: CredentialResponse) => {
    setIsLoading(true);
    setError('');

    try {
      if (!credentialResponse.credential) {
        throw new Error('No credential received from Google');
      }

      const response = await axios.post(`${API_BASE_URL}/signin`, {
        token: credentialResponse.credential
      }, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      // Store auth data
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.userId);
      localStorage.setItem('role', response.data.role);

      setIsLoading(false);
      navigate('/home');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Google authentication failed';
      setError(errorMessage);
      setIsLoading(false);
      console.error('Google login error:', err);
    }
  };

  const handleGoogleLoginError = () => {
    setError('Google login failed. Please try again.');
    console.error('Google login failed');
  };

  return {
    isLoading,
    error,
    handleGoogleLoginSuccess,
    handleGoogleLoginError
  };
};