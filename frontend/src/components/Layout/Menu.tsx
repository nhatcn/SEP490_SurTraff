import { Search, Bell, User, ChevronDown, Menu, X, AlertTriangle, Clock, Shield, LogOut } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Logo from "../../components/Logo/Logo";

interface HeaderProps {
  showMobileMenu: boolean;
  setShowMobileMenu: React.Dispatch<React.SetStateAction<boolean>>;
}

interface Notification {
  id: number;
  user_id: number | null;
  vehicle_id: number | null;
  accident_id: number | null;
  violation_id: number | null;
  message: string;
  notification_type: string;
  created_at: string;  // ISO string date from backend
  is_read: boolean;
}

function timeAgo(dateString: string) {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

const Header = ({ showMobileMenu, setShowMobileMenu }: HeaderProps) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const userId = 7; // Mặc định userId = 7

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await axios.get<Notification[]>(`http://localhost:8081/api/notifications/${userId}`);
        setNotifications(res.data);
      } catch (error) {
        console.error("Failed to fetch notifications", error);
      }
    }

    fetchNotifications();
  }, [userId]);

  async function markAsRead(notificationId: number) {
    try {
      await axios.put(`http://localhost:8081/api/notifications/read/${notificationId}`);
      // Xóa notification vừa đọc khỏi danh sách để biến mất ngay
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  }

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lọc chỉ thông báo chưa đọc
  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between shadow-sm relative z-50">
      <div className="flex items-center">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="md:hidden mr-4 text-gray-600 hover:text-gray-800 transition-colors duration-200"
          aria-label="Toggle mobile menu"
        >
          <div className="relative w-6 h-6">
            <X 
              size={24} 
              className={`absolute inset-0 transition-all duration-300 ${
                showMobileMenu 
                  ? 'opacity-100 rotate-0 scale-100' 
                  : 'opacity-0 rotate-90 scale-75'
              }`} 
            />
            <Menu 
              size={24} 
              className={`absolute inset-0 transition-all duration-300 ${
                showMobileMenu 
                  ? 'opacity-0 -rotate-90 scale-75' 
                  : 'opacity-100 rotate-0 scale-100'
              }`} 
            />
          </div>
        </button>
        <Logo />
      </div>
      
      <div className="flex items-center space-x-4">
        <nav className="hidden lg:flex space-x-6 mr-8">
          <a href="#" className="text-blue-700 font-medium hover:text-blue-900 transition-colors duration-200">Home</a>
          <a href="#" className="text-gray-500 hover:text-gray-800 transition-colors duration-200">Search Violations</a>
          <a href="#" className="text-gray-600 hover:text-gray-800 transition-colors duration-200">Help</a>
          <a href="#" className="text-gray-600 hover:text-gray-800 transition-colors duration-200">Contact</a>
        </nav>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationRef}>
          <button 
            className="relative p-2 rounded-full hover:bg-gray-100 transition-all duration-200 transform hover:scale-105"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Toggle notifications"
          >
            <Bell size={20} className="text-gray-600" />
            {unreadNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                {unreadNotifications.length}
              </span>
            )}
          </button>
          
          <div className={`absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 transition-all duration-300 ease-out transform ${
            showNotifications 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
          }`}>
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center">
                <Bell size={16} className="mr-2 text-blue-600" />
                Notifications
              </h3>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {unreadNotifications.length === 0 && (
                <p className="px-4 py-3 text-gray-500 text-center">No notifications</p>
              )}
              {unreadNotifications.map(n => (
                <div 
                  key={n.id} 
                  className="px-4 py-3 cursor-pointer transition-colors duration-200 bg-blue-50 border-l-4 border-blue-600"
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="flex items-start space-x-3">
                    {n.notification_type === 'violation' && <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />}
                    {n.notification_type === 'maintenance' && <Clock size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />}
                    {n.notification_type === 'security' && <Shield size={16} className="text-green-500 mt-0.5 flex-shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-gray-800">{n.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
                View all notifications
              </button>
            </div>
          </div>
        </div>
        
        {/* User Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button 
            className="flex items-center space-x-2 rounded-lg hover:bg-gray-100 py-2 px-3 transition-all duration-200 transform hover:scale-105"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="Toggle user menu"
          >
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm shadow-lg">
              CU
            </div>
            <span className="text-sm text-gray-700 font-medium hidden sm:block">Customer</span>
            <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform duration-200 ${
                showUserMenu ? 'rotate-180' : 'rotate-0'
              }`} 
            />
          </button>
          
          <div className={`absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 transition-all duration-300 ease-out transform ${
            showUserMenu 
              ? 'opacity-100 translate-y-0 scale-100' 
              : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
          }`}>
            <div className="py-2">
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-semibold shadow-lg">
                    CU
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Customer</p>
                    <p className="text-xs text-gray-500">customer@example.com</p>
                  </div>
                </div>
              </div>
              
              <a href="#" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 group">
                <User size={16} className="mr-3 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
                Your Profile
              </a>
              <a href="#" className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 group">
                <Shield size={16} className="mr-3 text-gray-400 group-hover:text-blue-600 transition-colors duration-200" />
                Settings
              </a>
              
              <div className="border-t border-gray-100 my-1"></div>
              
              <a href="#" className="flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 group">
                <LogOut size={16} className="mr-3 text-red-400 group-hover:text-red-600 transition-colors duration-200" />
                Sign out
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const MobileDropdownMenu = ({ showMobileMenu, setShowMobileMenu }: HeaderProps) => {
  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-30 z-40 transform transition-transform duration-300 ${
        showMobileMenu ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="bg-white w-64 h-full p-4">
        <button onClick={() => setShowMobileMenu(false)} className="mb-4 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Close Menu
        </button>
        <nav className="flex flex-col space-y-2">
          <a href="#" className="text-gray-700 hover:text-blue-600">Home</a>
          <a href="#" className="text-gray-700 hover:text-blue-600">Search Violations</a>
          <a href="#" className="text-gray-700 hover:text-blue-600">Help</a>
          <a href="#" className="text-gray-700 hover:text-blue-600">Contact</a>
        </nav>
      </div>
    </div>
  );
};

export { Header, MobileDropdownMenu };
