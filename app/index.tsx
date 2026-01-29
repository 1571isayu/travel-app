import { View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import PixelButton from '../components/PixelButton';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-pikmin-bg items-center justify-center p-6">
      <Text className="font-pixel text-2xl text-pikmin-earth mb-10 text-center leading-10">
        PIKMIN{'\n'}TRAVELER
      </Text>
      
      {/* 模擬 Firebase 登入 */}
      <View className="w-full">
         <PixelButton title="G 連結 Google 帳號" onPress={() => {}} color="bg-blue-500" />
         <View className="h-8" />
         <PixelButton 
            title="START! 開始冒險" 
            onPress={() => router.replace('/home' as any)} 
            color="bg-pikmin-red" 
            textStyle="text-lg"
         />
      </View>
    </View>
  );
}