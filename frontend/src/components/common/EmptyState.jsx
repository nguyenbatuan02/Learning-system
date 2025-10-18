import React from 'react';
import { FileQuestion } from 'lucide-react';
import Button from './Button';

const EmptyState = ({ 
  icon: Icon = FileQuestion,
  title = 'Không có dữ liệu',
  description,
  action,
  actionLabel,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 text-center max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && actionLabel && (
        <Button onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;