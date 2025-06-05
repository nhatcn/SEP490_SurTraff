import { Search, Bell, User, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

interface HeaderProps {
  title: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

export default function Header({ title }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userId = localStorage.getItem('userId');
        const role = localStorage.getItem('role') || 'Admin';
        
        if (!userId) {
          setUserData({ 
            id: '', 
            name: 'Admin', 
            email: '', 
            role: role 
          });
          setLoading(false);
          return;
        }

        const response = await fetch(`http://localhost:8081/api/users/${userId}`);
        
        if (response.ok) {
          const user = await response.json();
          console.log('User data from API:', user); // Debug log
          setUserData({ 
            ...user, 
            role: role || user.role || 'Admin' 
          });
        } else {
          // Fallback if API call fails
          setUserData({ 
            id: userId, 
            name: 'User', 
            email: '', 
            role: role 
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback on error
        const userId = localStorage.getItem('userId') || '';
        const role = localStorage.getItem('role') || 'Admin';
        setUserData({ 
          id: userId, 
          name: 'User', 
          email: '', 
          role: role 
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Generate avatar initials from name or email
  const getAvatarInitials = (user: UserData) => {
    if (user.name) {
      const words = user.name.split(' ').filter(word => word.length > 0);
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return user.name.substring(0, 2).toUpperCase();
    }
    
    if (user.email) {
      const namePart = user.email.split('@')[0];
      return namePart.substring(0, 2).toUpperCase();
    }
    
    return 'AD';
  };
  
  return (
    <header className="bg-white border-gray-200 py-4 px-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      </div>
      
      <div className="flex items-center space-x-4">

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
            {userData?.avatar ? (
              <img 
                src={userData.avatar} 
                alt="User Avatar" 
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div 
              className={`bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-medium ${userData?.avatar ? 'hidden' : ''}`}
            >
              {loading ? '...' : (userData ? getAvatarInitials(userData) : 'AD')}
            </div>
            <span className="text-sm text-gray-700 font-medium">
              {loading ? 'Loading...' : (userData?.name || userData?.role || 'Admin')}
            </span>
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