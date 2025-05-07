// import { useState } from 'react';

// function LoginPage({ onRegisterClick, onLoginSuccess }) {
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     console.log('Login with:', { username, password });
//     if (onLoginSuccess) onLoginSuccess();
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
//       <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md">
//         <h2 className="text-2xl font-bold mb-6 text-center">Đăng Nhập</h2>
        
//         {/* Google Login Button */}
//         <button className="flex items-center justify-center w-full bg-white text-gray-700 border border-gray-300 rounded py-2 px-4 hover:bg-gray-50 mb-4">
//           <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
//             <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
//             <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
//             <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
//             <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
//           </svg>
//           Đăng Nhập bằng Google
//         </button>

//         <form onSubmit={handleSubmit}>
//           <div className="mb-4">
//             <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
//             <input
//               type="text"
//               className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//               placeholder="Nhập tên đăng nhập"
//               value={username}
//               onChange={(e) => setUsername(e.target.value)}
//               required
//             />
//           </div>
          
//           <div className="mb-6">
//             <div className="flex justify-between items-center mb-1">
//               <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
//               <a href="#" className="text-blue-600 hover:text-blue-800 text-sm">Quên mật khẩu?</a>
//             </div>
//             <input
//               type="password"
//               className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
//               placeholder="Nhập mật khẩu"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//             />
//           </div>
          
//           <button 
//             type="submit"
//             className="w-full bg-blue-600 text-white py-2 px-4 rounded font-medium hover:bg-blue-700"
//           >
//             Đăng Nhập
//           </button>
//         </form>
        
//         <div className="mt-4 text-center text-sm">
//           <span className="text-gray-600">Chưa có tài khoản?</span>{' '}
//           <a 
//             href="#" 
//             className="text-blue-600 hover:text-blue-800"
//             onClick={(e) => {
//               e.preventDefault();
//               if (onRegisterClick) onRegisterClick();
//             }}
//           >
//             Đăng ký
//           </a>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default LoginPage;