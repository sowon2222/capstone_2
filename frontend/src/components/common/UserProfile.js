import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export const UserProfile = ({ className = '' }) => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
          {user.profileImage ? (
            <img 
              src={user.profileImage} 
              alt={user.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#346aff] text-white text-lg font-semibold">
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">{user.name}</span>
        <span className="text-xs text-gray-400">{user.email}</span>
      </div>
    </div>
  );
}; 