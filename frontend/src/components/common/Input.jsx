import React, { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  helperText,
  type = 'text',
  className = '',
  required = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  ...props
}, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <LeftIcon className="h-5 w-5" />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
            LeftIcon ? 'pl-10' : ''
          } ${
            RightIcon ? 'pr-10' : ''
          } ${
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300'
          } ${className}`}
          {...props}
        />
        {RightIcon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <RightIcon className="h-5 w-5" />
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;