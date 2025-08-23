import React from 'react';

interface BounceLoadingComponentProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const BounceLoadingComponent: React.FC<BounceLoadingComponentProps> = ({ 
  fullScreen = true, 
  size = 'md',
  showText = true,
  className = ''
}) => {
  // Size configurations
  const sizeConfig = {
    sm: { logo: 'w-12 h-12', shadow: 'w-8 h-2', text: 'text-sm' },
    md: { logo: 'w-24 h-24', shadow: 'w-16 h-4', text: 'text-base' },
    lg: { logo: 'w-32 h-32', shadow: 'w-20 h-5', text: 'text-lg' }
  };

  const config = sizeConfig[size];
  
  // Container classes based on fullScreen prop
  const containerClasses = fullScreen 
    ? "fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 backdrop-blur-sm z-50"
    : "flex items-center justify-center bg-white bg-opacity-90 backdrop-blur-sm rounded-lg w-full h-full min-h-[200px]";

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="flex flex-col items-center">
        {/* Logo với hiệu ứng bounce */}
        <div className="relative">
          <img
            src="screenshot_1749087176-removebg-preview.png"
            alt="Loading logo"
            className={`${config.logo} object-contain animate-bounce drop-shadow-lg`}
            style={{
              animationDuration: '1s',
              animationIterationCount: 'infinite'
            }}
          />
          
          {/* Đổ bóng dưới logo */}
          <div 
            className={`absolute -bottom-2 left-1/2 transform -translate-x-1/2 ${config.shadow} bg-gray-300 rounded-full opacity-30 animate-pulse`}
            style={{
              animationDuration: '1s',
              animationTimingFunction: 'ease-in-out'
            }}
          />
        </div>
        
        {/* Text loading - chỉ hiển thị khi showText = true */}
        {showText && (
          <div className={`mt-6 flex items-center space-x-1 ${config.text}`}>
            <span className="text-gray-600 font-medium">Loading</span>
            
          </div>
        )}
      </div>
    </div>
  );
};

export default BounceLoadingComponent;