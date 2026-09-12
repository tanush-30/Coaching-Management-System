'use client';

import React, { useState } from 'react';
import { User, GraduationCap, Shield, Users } from 'lucide-react';

interface UserAvatarProps {
  src?: string;
  name?: string;
  type?: 'student' | 'faculty' | 'admin' | 'parent';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

const ICON_SIZES = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
  xl: 'w-10 h-10',
};

const TYPE_GRADIENTS = {
  student: 'from-indigo-600 to-sky-600 text-white',
  faculty: 'from-purple-600 to-indigo-600 text-white',
  admin: 'from-slate-800 to-indigo-900 text-white',
  parent: 'from-emerald-600 to-teal-600 text-white',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  name = '',
  type = 'student',
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  // Extract initials if name provided
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const iconSize = ICON_SIZES[size] || ICON_SIZES.md;
  const gradientClass = TYPE_GRADIENTS[type] || TYPE_GRADIENTS.student;

  const hasValidPhoto = src && src.trim() !== '' && !imgError;

  if (hasValidPhoto) {
    return (
      <img
        src={src}
        alt={name || 'User Avatar'}
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-2xl object-cover border border-slate-200/80 shadow-xs ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-2xl bg-gradient-to-tr ${gradientClass} flex items-center justify-center font-bold tracking-tight select-none shadow-xs border border-white/20 shrink-0 ${className}`}
      title={name || type}
    >
      {initials ? (
        <span>{initials}</span>
      ) : type === 'faculty' ? (
        <GraduationCap className={iconSize} />
      ) : type === 'admin' ? (
        <Shield className={iconSize} />
      ) : (
        <User className={iconSize} />
      )}
    </div>
  );
};
