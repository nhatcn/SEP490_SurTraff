import {   
  Camera, LayoutDashboard, Users, Settings, Bell, Map, LogOut 
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../Logo/Logo";

interface SidebarProps {
  defaultActiveItem?: string;
}

export default function Sidebar({ defaultActiveItem = "dashboard" }: SidebarProps) {
  const [expanded, setExpanded] = useState(true);
  const [activeItem, setActiveItem] = useState(defaultActiveItem);
  const navigate = useNavigate();

  const menuItems = [
    { id: "dashboard", name: "Dashboard", icon: <LayoutDashboard size={20} />, path: "/dashboard" },
    { id: "cameras", name: "Cameras", icon: <Camera size={20} />, path: "/cameras" },
    { id: "map", name: "Map", icon: <Map size={20} />, path: "/map" },
    { id: "users", name: "Users", icon: <Users size={20} />, path: "/userdashboard" },
    { id: "alerts", name: "Alerts", icon: <Bell size={20} />, path: "/alerts" },
    { id: "settings", name: "Settings", icon: <Settings size={20} />, path: "/settings" },
  ];

  const handleItemClick = (itemId: string, path: string) => {
    setActiveItem(itemId);
    navigate(path);
  };

  return (
    <div className={`
      bg-gradient-to-b from-slate-800 via-gray-800 to-slate-900 text-white flex flex-col h-full transition-all duration-500 relative shadow-2xl
      ${expanded ? "w-55" : "w-20"}
    `}>
      {/* Logo and Toggle Button */}
      <div className="p-2 flex items-center border-b border-gray-700/50 relative backdrop-blur-sm">
        {/* Logo - always centered */}
        <div className="flex-1 flex justify-center">
          <Logo expanded={expanded} />
        </div>
        
        {/* Single Toggle Button - always in top right */}
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-all duration-300 hover:bg-white/10 rounded-full p-1 hover:scale-110 group"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform duration-300 group-hover:rotate-180">
            {expanded ? (
              <path d="M15 18l-6-6 6-6" />
            ) : (
              <path d="M9 18l6-6-6-6" />
            )}
          </svg>
        </button>
      </div>

      {/* Sidebar Items */}
      <div className="py-2 flex-grow">
        <nav>
          <ul>
            {menuItems.map(item => (
              <li key={item.id} className="relative ml-[-20px]">
                <button
                  onClick={() => handleItemClick(item.id, item.path)}
                  className={`
                    w-full flex items-center py-3 p-4 
                    ${expanded ? "justify-start" : "justify-center"}
                    ${activeItem === item.id 
                      ? "bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-lg transform scale-105" 
                      : "text-gray-400 hover:bg-gradient-to-r hover:from-gray-700 hover:to-slate-700 hover:text-white"
                    }
                    rounded-xl mx-2 mb-1 transition-all duration-300 transform hover:scale-105 hover:shadow-lg group
                  `}
                >
                  <span className={`transition-all duration-300 ${activeItem === item.id ? 'drop-shadow-sm' : 'group-hover:drop-shadow-sm'}`}>{item.icon}</span>
                  {expanded && (
                    <span className={`ml-3 text-sm font-medium transition-all duration-300 ${activeItem === item.id ? 'drop-shadow-sm' : ''}`}>{item.name}</span>
                  )}
                  
                  {/* Hover glow effect */}
                  {activeItem !== item.id && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/0 to-indigo-600/0 group-hover:from-blue-600/10 group-hover:to-indigo-600/10 transition-all duration-300 pointer-events-none"></div>
                  )}
                </button>

                {expanded && activeItem === item.id && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-blue-300 to-indigo-300 h-2 w-2 rounded-full z-20 pointer-events-none shadow-lg animate-pulse"></div>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Logout Button */}
      <div className={`mt-auto p-4 border-t border-gray-700/50 ${!expanded && "flex justify-center"} backdrop-blur-sm`}>
        <button className="flex items-center text-gray-400 hover:text-red-400 transition-all duration-300 hover:bg-red-500/10 rounded-lg p-2 transform hover:scale-105 group">
          <LogOut size={20} className="group-hover:rotate-12 transition-transform duration-300" />
          {expanded && <span className="ml-3 text-sm font-medium">Log Out</span>}
        </button>
      </div>
    </div>
  );
}