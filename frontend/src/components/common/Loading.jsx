import React from 'react';
import { Loader2 } from 'lucide-react';

const Loading = ({ 
  fullScreen = false, 
  text = 'Đang tải...', 
  size = 'md' 
}) => {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50">
        <div className="text-center">
          <Loader2 className={`${sizes.lg} animate-spin text-blue-600 mx-auto`} />
          <p className="mt-4 text-gray-600 font-medium">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className={`${sizes[size]} animate-spin text-blue-600 mx-auto`} />
        <p className="mt-3 text-sm text-gray-600">{text}</p>
      </div>
    </div>
  );
};

export default Loading;