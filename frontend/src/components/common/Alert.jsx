import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

const Alert = ({ 
  type = 'info', 
  title, 
  children, 
  onClose,
  className = '' 
}) => {
  const types = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      icon: Info,
      iconColor: 'text-blue-600',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      icon: CheckCircle,
      iconColor: 'text-green-600',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: AlertCircle,
      iconColor: 'text-red-600',
    },
  };

  const { bg, border, text, icon: Icon, iconColor } = types[type];

  return (
    <div className={`${bg} border ${border} rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <Icon className={`h-5 w-5 ${iconColor} mr-3 flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          {title && (
            <h3 className={`text-sm font-semibold ${text} mb-1`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${text}`}>
            {children}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`ml-3 ${text} hover:opacity-70 transition-opacity`}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;