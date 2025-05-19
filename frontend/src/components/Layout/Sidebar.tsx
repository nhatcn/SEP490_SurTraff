import { 
  Camera, 
  LayoutDashboard, 
  Users, 
  Settings, 
  Bell, 
  Map, 
  LogOut 
} from "lucide-react";
import { useState } from "react";

export default function Sidebar() {
  const [expanded, setExpanded] = useState(true);
  const [activeItem, setActiveItem] = useState("cameras");

  const menuItems = [
    { id: "dashboard", name: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { id: "cameras", name: "Cameras", icon: <Camera size={20} /> },
    { id: "map", name: "Map", icon: <Map size={20} /> },
    { id: "users", name: "Users", icon: <Users size={20} /> },
    { id: "alerts", name: "Alerts", icon: <Bell size={20} /> },
    { id: "settings", name: "Settings", icon: <Settings size={20} /> },
  ];

  return (
    <div 
      className={`
        bg-gray-700 text-white flex flex-col h-full transition-all duration-300
        ${expanded ? "w-64" : "w-20"}
      `}
    >
      <div className="p-4 flex items-center justify-between border-b border-gray-800">
        <div className={`flex items-center ${!expanded && "justify-center w-full"}`}>
          <div className="bg-blue-600 p-2 rounded-lg">
            <Camera size={expanded ? 20 : 24} />
          </div>
          {expanded && (
            <span className="font-bold ml-3 text-lg whitespace-nowrap">SurTraff</span>
          )}
        </div>
        
        {expanded && (
          <button 
            onClick={() => setExpanded(false)}
            className="text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        
        {!expanded && (
          <button 
            onClick={() => setExpanded(true)}
            className="absolute -right-3 top-10 bg-blue-600 rounded-full p-1 shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}
      </div>

      <div className="py-4 flex-grow">
        <nav>
          <ul>
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveItem(item.id)}
                  className={`
                    w-full flex items-center py-3 px-4 
                    ${expanded ? "justify-start" : "justify-center"}
                    ${activeItem === item.id 
                      ? "bg-blue-600 text-white" 
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                    }
                    rounded-lg mx-2 mb-1 transition-colors
                  `}
                >
                  <span className={activeItem === item.id ? "text-white" : "text-gray-400"}>
                    {item.icon}
                  </span>
                  
                  {expanded && (
                    <span className="ml-3 text-sm font-medium">{item.name}</span>
                  )}
                  
                  {expanded && activeItem === item.id && (
                    <span className="ml-auto bg-blue-500 h-2 w-2 rounded-full"></span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className={`mt-auto p-4 border-t border-gray-800 ${!expanded && "flex justify-center"}`}>
        <button 
          className={`
            flex items-center text-gray-400 hover:text-white transition-colors
            ${expanded ? "" : "justify-center"}
          `}
        >
          <LogOut size={20} />
          {expanded && <span className="ml-3 text-sm">Log Out</span>}
        </button>
      </div>
    </div>
  );
}