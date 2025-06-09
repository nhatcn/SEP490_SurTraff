import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Eye, EyeOff, Lock, Save, X, CheckCircle, UserCircle } from 'lucide-react';

interface UserData {
  userId: number;
  userName: string;
  email: string | null;
  status: boolean;
  password: string;
  avatar: string;
  roleId: number;
  roleName: string;
  name: string;
}

export default function UserProfile() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const userId = 1; // Replace with actual userId source
      const response = await fetch(`http://localhost:8081/api/users/${userId}`);
      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validatePassword = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!passwordForm.currentPassword) {
      newErrors.currentPassword = 'Please enter your current password';
    }
    
    if (!passwordForm.newPassword) {
      newErrors.newPassword = 'Please enter a new password';
    } else if (passwordForm.newPassword.length < 6) {
      newErrors.newPassword = 'New password must be at least 6 characters';
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Password confirmation does not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordChange = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) return;
    
    setIsSubmitting(true);
    setErrors({});
    
    try {
      const response = await fetch(`http://localhost:8081/api/users/${user?.userId}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      
      if (response.ok) {
        setSuccess('Password changed successfully!');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setIsEditingPassword(false);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setErrors({ currentPassword: 'Incorrect current password' });
      }
    } catch (error) {
      setErrors({ general: 'An error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelPasswordEdit = () => {
    setIsEditingPassword(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setErrors({});
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center text-gray-500 p-8">
        Unable to load user information
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-32"></div>
        <div className="relative px-6 pb-6">
          <div className="flex items-center -mt-16">
            <div className="relative">
              <img
                src={user.avatar || '/api/placeholder/120/120'}
                alt={user.name}
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover bg-gray-100"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  if (target.nextElementSibling) {
                    (target.nextElementSibling as HTMLElement).style.display = 'flex';
                  }
                }}
              />
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gray-100 hidden items-center justify-center">
                <UserCircle className="w-12 h-12 text-gray-400" />
              </div>
            </div>
            <div className="ml-6 mt-12">
              <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-gray-600">@{user.userName}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user.status 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {user.status ? 'Active' : 'Inactive'}
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium capitalize">
                  {user.roleName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Basic Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Full Name</label>
              <p className="text-gray-900 font-medium">{user.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Username</label>
              <p className="text-gray-900 font-medium">{user.userName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900 font-medium flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                {user.email || 'Not provided'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">User ID</label>
              <p className="text-gray-900 font-medium">#{user.userId}</p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Security
          </h2>
          
          {!isEditingPassword ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Role</label>
                <p className="text-gray-900 font-medium capitalize">{user.roleName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Account Status</label>
                <p className={`font-medium ${user.status ? 'text-green-600' : 'text-red-600'}`}>
                  {user.status ? 'Active' : 'Locked'}
                </p>
              </div>
              <button
                onClick={() => setIsEditingPassword(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Change Password
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {errors.general && (
                <div className="text-red-600 text-sm">{errors.general}</div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 ${
                      errors.currentPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.currentPassword && <p className="text-red-500 text-sm mt-1">{errors.currentPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 ${
                      errors.newPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handlePasswordChange}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSubmitting ? 'Saving...' : 'Save Password'}
                </button>
                <button
                  type="button"
                  onClick={cancelPasswordEdit}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
