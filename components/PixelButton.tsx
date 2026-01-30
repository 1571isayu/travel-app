import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function PixelButton({ title, onPress, color }: any) {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[styles.button, { backgroundColor: color || '#E84A41' }]} // 預設皮克敏紅
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 10,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    // 像素按鈕陰影效果
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  text: {
    color: 'white',
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 10,
  },
});