import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function PixelCard({ children, style }: any) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF', // 強制白色背景
    borderWidth: 3,
    borderColor: '#6D4C41',     // 土地棕邊框
    padding: 15,
    borderRadius: 0,            // 像素風通常是直角
    marginBottom: 10,
    // 模擬像素陰影
    borderBottomWidth: 6,
    borderRightWidth: 6,
  },
});