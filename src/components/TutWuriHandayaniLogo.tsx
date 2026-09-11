import React from 'react';

interface TutWuriHandayaniLogoProps {
  className?: string;
  variant?: 'blue_gold' | 'green_gold' | 'teal' | 'official' | 'white';
  size?: number;
}

export const TutWuriHandayaniLogo: React.FC<TutWuriHandayaniLogoProps> = ({
  className = '',
  variant = 'official',
  size = 36,
}) => {
  // Color presets tailored for each card design
  let primaryColor = '#1e3a8a'; // Navy
  let secondaryColor = '#d4af37'; // Gold
  let accentColor = '#3b82f6';
  let bgColor = '#ffffff';

  if (variant === 'blue_gold') {
    primaryColor = '#0f2b5c';
    secondaryColor = '#c59b27';
    accentColor = '#1d4ed8';
    bgColor = '#f8fafc';
  } else if (variant === 'green_gold') {
    primaryColor = '#134e4a';
    secondaryColor = '#d97706';
    accentColor = '#10b981';
    bgColor = '#ecfdf5';
  } else if (variant === 'teal') {
    primaryColor = '#0891b2';
    secondaryColor = '#06b6d4';
    accentColor = '#f97316';
    bgColor = '#f0fdfa';
  } else if (variant === 'white') {
    primaryColor = '#ffffff';
    secondaryColor = '#fef08a';
    accentColor = '#e2e8f0';
    bgColor = 'transparent';
  } else {
    // Official Kemdikbud colors
    primaryColor = '#0284c7';
    secondaryColor = '#eab308';
    accentColor = '#dc2626';
    bgColor = '#ffffff';
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label="Logo Tut Wuri Handayani"
    >
      <title>Logo Tut Wuri Handayani</title>
      {/* 1. Belimbing Segi Lima (Pentagon Outer Frame) */}
      <path
        d="M50 4 L94 36 L77 88 L23 88 L6 36 Z"
        fill={bgColor}
        stroke={secondaryColor}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M50 8 L90 37 L74 84 L26 84 L10 37 Z"
        fill="none"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* 2. Sayap Burung Garuda (Garuda Wings) */}
      {/* Left Wing */}
      <path
        d="M50 50 C40 42 22 45 16 56 C24 55 35 56 46 64 C35 63 22 66 18 73 C28 71 38 72 48 76 C40 76 28 80 26 83 C36 82 44 80 50 78 Z"
        fill={secondaryColor}
        opacity="0.95"
      />
      {/* Right Wing */}
      <path
        d="M50 50 C60 42 78 45 84 56 C76 55 65 56 54 64 C65 63 78 66 82 73 C72 71 62 72 52 76 C60 76 72 80 74 83 C64 82 56 80 50 78 Z"
        fill={secondaryColor}
        opacity="0.95"
      />

      {/* 3. Ekor Garuda (Tail Feathers) */}
      <path
        d="M44 76 L44 86 L50 84 L56 86 L56 76 Z"
        fill={primaryColor}
      />

      {/* 4. Buku Terbuka (Open Book of Knowledge) */}
      <path
        d="M50 63 C44 59 36 60 30 63 L30 71 C36 68 44 67 50 70 C56 67 64 68 70 71 L70 63 C64 60 56 59 50 63 Z"
        fill={bgColor}
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line x1="50" y1="63" x2="50" y2="70" stroke={primaryColor} strokeWidth="1.5" />

      {/* 5. Belencong / Api Menyala (Torch & Flame of Learning) */}
      <path
        d="M50 22 C48 30 42 34 42 40 C42 46 46 50 50 50 C54 50 58 46 58 40 C58 34 52 30 50 22 Z"
        fill={accentColor}
      />
      <path
        d="M50 28 C49 33 46 36 46 41 C46 44 48 47 50 47 C52 47 54 44 54 41 C54 36 51 33 50 28 Z"
        fill={secondaryColor}
      />
      {/* Base of Lamp */}
      <path
        d="M43 50 L57 50 L54 56 L46 56 Z"
        fill={primaryColor}
      />
    </svg>
  );
};
