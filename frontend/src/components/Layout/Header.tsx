import { Search, Bell, User, ChevronDown } from "lucide-react";
import { useState } from "react";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  return (
    <header className="bg-white  border-gray-200 py-4 px-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
            <Search size={18} className="text-gray-500" />
            <input 
              type="text" 
              placeholder="Search cameras..." 
              className="bg-transparent border-none outline-none ml-2 text-sm w-48 placeholder-gray-400"
            />
          </div>
        </div>
        
        <div className="relative">
          <button 
            className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 bg-red-500 w-2 h-2 rounded-full"></span>
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
              <div className="px-4 py-2 border-b border-gray-100">
                <h3 className="font-medium text-gray-800">Notifications</h3>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-gray-50 border-l-4 border-red-500">
                  <p className="text-sm font-medium text-gray-800">Camera #103 detected violation</p>
                  <p className="text-xs text-gray-500">2 minutes ago</p>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50">
                  <p className="text-sm font-medium text-gray-800">System maintenance completed</p>
                  <p className="text-xs text-gray-500">1 hour ago</p>
                </div>
                <div className="px-4 py-3 hover:bg-gray-50 border-l-4 border-yellow-500">
                  <p className="text-sm font-medium text-gray-800">Storage space at 80% capacity</p>
                  <p className="text-xs text-gray-500">3 hours ago</p>
                </div>
              </div>
              
              <div className="px-4 py-2 border-t border-gray-100 text-center">
                <button className="text-sm text-blue-600 hover:text-blue-800">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="relative">
          <button 
            className="flex items-center space-x-2 rounded-lg hover:bg-gray-100 py-1 px-2 transition-colors"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-medium">
              AD
            </div>
            <span className="text-sm text-gray-700 font-medium">Admin</span>
            <ChevronDown size={16} className="text-gray-500" />
          </button>
          
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Your Profile
              </a>
              <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                Settings
              </a>
              <div className="border-t border-gray-100 my-1"></div>
              <a href="#" className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                Sign out
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}