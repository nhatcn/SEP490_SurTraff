import React, { useState } from 'react';
import AuthLayout from '../../components/Auth/AuthLayout';
import AuthInput from '../../components/Auth/AuthInput';
import AuthButton from '../../components/Auth/AuthButton';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:8080/api/users/forgotPassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        const data = await response.json();
        setError(data.detail || 'Something went wrong.');
      }
    } catch (err) {
      setError('Unable to send request. Please try again later.');
    }
  };

  const EmailIcon = () => (
    <svg 
      className="h-4 w-4 text-gray-400" 
      fill="currentColor" 
      viewBox="0 0 20 20"
    >
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  );

  return (
    <AuthLayout title="Forgot Password">
      {!isSubmitted ? (
        <>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          <p className="text-white text-center mb-6">
            Enter your email address and we'll send you a new password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AuthInput
              id="email"
              type="email"
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<EmailIcon />}
            />

            <AuthButton type="submit">Send New Password</AuthButton>
          </form>
        </>
      ) : (
        <div className="text-center text-white">
          <svg 
            className="h-16 w-16 text-green-400 mx-auto mb-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          <p className="mb-4">
            A new password has been sent to <strong>{email}</strong>
          </p>
          <p className="text-sm">
            Please check your inbox.
          </p>
        </div>
      )}

      <div className="text-center mt-6">
        <p className="text-white">
          Remember your password?{' '}
          <a href="/login" className="text-blue-400 hover:text-blue-300">
            Back to Login
          </a>
        </p>
      </div>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
