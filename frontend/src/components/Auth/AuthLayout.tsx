import React from 'react';

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, children }) => {
  return (
    <div 
      className="min-h-screen bg-cover bg-center flex items-center justify-center"
      style={{
        backgroundImage: `url('https://migviet.com/wp-content/uploads/2021/09/1a-3.jpg')`, 
        backgroundBlendMode: 'overlay',
        backgroundColor: 'rgba(0,0,0,0.5)'
      }}
    >
      <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h2 className="text-center text-3xl font-bold text-white mb-6">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;