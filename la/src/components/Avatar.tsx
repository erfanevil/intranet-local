"use client";

import { useState } from "react";

interface AvatarProps {
  avatar?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  isOnline?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-14 h-14 text-xl",
  xl: "w-20 h-20 text-3xl",
};

const onlineDotSizes = {
  sm: "w-2.5 h-2.5 -bottom-0.5 -left-0.5",
  md: "w-3 h-3 -bottom-0.5 -left-0.5",
  lg: "w-3.5 h-3.5 -bottom-0.5 -left-0.5",
  xl: "w-4 h-4 -bottom-1 -left-1",
};

export default function Avatar({ avatar, name, size = "md", isOnline, className = "" }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = avatar ? `/api/avatar/${avatar}` : null;

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold shadow overflow-hidden`}>
        {avatarUrl && !imgError ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span>{name.charAt(0)}</span>
        )}
      </div>
      {isOnline !== undefined && (
        <span
          className={`absolute ${onlineDotSizes[size]} rounded-full border-2 border-white ${
            isOnline ? "bg-green-500" : "bg-slate-400"
          }`}
        />
      )}
    </div>
  );
}
