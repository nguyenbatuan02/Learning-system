import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  padding = true,
  hover = false,
  onClick,
}) => {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${
        padding ? 'p-6' : ''
      } ${
        hover ? 'hover:shadow-md transition-shadow cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;