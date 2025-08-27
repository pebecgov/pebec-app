// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import Image from "next/image";
import React from "react";

type UserAvatarProps = {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
};

export default function UserAvatar({
  src,
  alt = "Profile",
  size = 36,
  className = ""
}: UserAvatarProps) {
  const finalSrc = src && src.trim() !== "" ? src : "/default-avatar.png";
  const baseClasses = "rounded-full aspect-square object-cover border border-gray-300";
  const merged = `${baseClasses} ${className}`.trim();

  return (
    <Image
      src={finalSrc}
      alt={alt}
      width={size}
      height={size}
      className={merged}
    />
  );
}


