import { View } from 'react-native';
import React from 'react';

interface PixelCardProps {
  children: React.ReactNode; // 代表任何可以被渲染的 React 內容
  className?: string;
}

export default function PixelCard({ children, className = '' }: PixelCardProps) {
  return (
    <View className={`bg-white border-4 border-pikmin-earth p-4 mb-4 shadow-sm ${className}`}>
      {children}
    </View>
  );
}