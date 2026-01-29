import { TouchableOpacity, Text, View } from 'react-native';

// 1. 定義介面，告訴 TS 這些參數是什麼
interface PixelButtonProps {
  title: string;       // 標題必須是字串
  onPress: () => void; // onPress 必須是一個函式
  color?: string;      // 加個問號代表「非必填」
  textStyle?: string;  // 非必填
}

// 2. 將型別應用到元件上
export default function PixelButton({ 
  title, 
  onPress, 
  color = 'bg-pikmin-leaf', 
  textStyle = '' 
}: PixelButtonProps) { // <--- 這裡指定型別
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} className="mb-4">
      <View className="absolute top-1 left-1 w-full h-full bg-pikmin-earth rounded-sm" />
      <View className={`relative ${color} border-2 border-pikmin-earth p-3 rounded-sm active:top-1 active:left-1`}>
        <Text className={`text-white font-pixel text-center text-xs leading-5 ${textStyle}`}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}