import React from 'react';
import { cn } from '../utils/cn';

interface UserAvatarProps {
  name: string;
  url?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function UserAvatar({ name, url, size = 'md', className }: UserAvatarProps) {
  const initial = name.charAt(0).toUpperCase();
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-32 h-32 text-4xl',
  };

  return (
    <div className={cn(
      "rounded-full border-2 border-primary-container overflow-hidden bg-primary relative flex items-center justify-center shrink-0 shadow-inner",
      sizeClasses[size],
      className
    )}>
      {url ? (
        <img 
          src={url} 
          alt={name} 
          className="w-full h-full object-cover relative z-10" 
          referrerPolicy="no-referrer" 
        />
      ) : (
        <>
          {/* Branded Background Effect */}
          <img 
            src="/icon.png" 
            alt="" 
            className="absolute inset-0 w-full h-full object-cover opacity-30 selection:bg-transparent pointer-events-none scale-110"
          />
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-[1px]" />
          <span className="relative z-10 font-black text-on-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
            {initial}
          </span>
        </>
      )}
    </div>
  );
}
