"use client"

// pages/Auth/LoginPage.tsx

import type React from "react"
import { useState } from "react"
import { GoogleLogin } from "@react-oauth/google"
import AuthLayout from "../../components/Auth/AuthLayout"
import AuthInput from "../../components/Auth/AuthInput"
import AuthButton from "../../components/Auth/AuthButton"
import Logo from "../../components/Logo/Logo"
import { useLogin, useGoogleAuth } from "../../hooks/Auth/useAuth"
import type { LoginFormData } from "../../types/Auth/auth"

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState<LoginFormData>({
    username: "",
    password: "",
    rememberMe: false,
  })

  const { isLoading, error, login } = useLogin()
  const {
    isLoading: googleLoading,
    error: googleError,
    handleGoogleLoginSuccess,
    handleGoogleLoginError,
  } = useGoogleAuth()


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(formData)
  }

  const handleInputChange = (field: keyof LoginFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  const UserIcon = () => (
    <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  )

  const LockIcon = () => (
    <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  )

  const currentError = error || googleError
  const currentLoading = isLoading || googleLoading

  const currentError = error || googleError;
  const currentLoading = isLoading || googleLoading;

  return (
    <AuthLayout title="">
      {/* Logo Section */}
      <div className="flex justify-center mb-8">
        <Logo />
      </div>

      {/* Welcome Text */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
        <p className="text-white/70">Sign in to your account to continue</p>
      </div>


      {currentError && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
          {currentError}
        </div>
      )}

      {/* Google Login Button */}
      <div className="mb-4">
        <GoogleLogin
          onSuccess={handleGoogleLoginSuccess}
          onError={handleGoogleLoginError}
          useOneTap={true}
          theme="outline"
          size="large"
          width="100%"
          text="signin_with"
          shape="rectangular"
          logo_alignment="left"
        />
      </div>

      {googleLoading && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-500 text-sm text-center">
          Signing in with Google...
        </div>
      )}

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
          onChange={handleInputChange("username")}
          icon={<UserIcon />}
          disabled={currentLoading}
        />

        <AuthInput
          id="password"
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleInputChange("password")}
          icon={<LockIcon />}
          disabled={currentLoading}
        />

        <div className="flex justify-between items-center">
          <a
            href="/forgotpassword"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
          >
            Forgot password?
          </a>
        </div>

        <AuthButton type="submit" disabled={currentLoading}>

          {isLoading ? "Signing In..." : "Sign In"}

        </AuthButton>
      </form>

      <div className="text-center mt-6">
        <p className="text-white">
          Don't have an account?{" "}
          <a href="/register" className="text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium">
            Register
          </a>
        </p>
      </div>
    </AuthLayout>
  )
}

export default LoginPage
