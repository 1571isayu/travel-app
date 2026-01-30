// 1. 引入 React Native 基礎元件 (為了解決 ActivityIndicator, View, Text)
import "../global.css";
// 2. 引入 Expo Router 的堆疊導航 (為了解決 Stack)
import { Stack } from 'expo-router';

// 3. 引入你的狀態管理 (為了解決 AppProvider)
// 注意：如果你的 context 資料夾是在根目錄，用 ../context/AppContext
import { View } from 'react-native'; // 記得 import View
import { AppProvider } from '../context/AppContext';

// 4. 引入字體 (你原本就有的)
import { PressStart2P_400Regular, useFonts } from '@expo-google-fonts/press-start-2p';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  // ... 這裡是你剛剛貼的 Loading 邏輯 ...

  return (
    // 現在程式知道 AppProvider 是誰了！
    <AppProvider>
<View style={{ flex: 1, backgroundColor: '#FEF9E7' }}> 
      <Stack screenOptions={{ headerShown: false }} />
    </View>
    </AppProvider>
  );
}