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
      bg-gray-700 text-white flex flex-col h-full transition-all duration-300 relative
      ${expanded ? "w-55" : "w-20"}
    `}>
      {/* Logo and Toggle Button */}
      <div className="p-2 flex items-center border-b border-gray-800 relative">
        {/* Logo - always centered */}
        <div className="flex-1 flex justify-center">
          <Logo expanded={expanded} />
        </div>
        
        {/* Single Toggle Button - always in top right */}
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                      ? "bg-blue-600 text-white" 
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }
                    rounded-lg mx-2 mb-1 transition-colors relative
                  `}
                >
                  <span>{item.icon}</span>
                  {expanded && (
                    <span className="ml-3 text-sm font-medium">{item.name}</span>
                  )}
                </button>

                {expanded && activeItem === item.id && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-blue-300 h-2 w-2 rounded-full z-20 pointer-events-none shadow-sm"></div>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Logout Button */}
      <div className={`mt-auto p-4 border-t border-gray-800 ${!expanded && "flex justify-center"}`}>
        <button className="flex items-center text-gray-400 hover:text-white transition-colors">
          <LogOut size={20} />
          {expanded && <span className="ml-3 text-sm">Log Out</span>}
        </button>
      </div>
    </div>
  );
}