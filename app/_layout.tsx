import "../global.css"; // 放在這裡才對！
import { Stack } from 'expo-router';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
import { AppProvider } from '../context/AppContext';
import { View, Text } from 'react-native';

export default function Layout() {
  const [fontsLoaded] = useFonts({ PressStart2P_400Regular });

  if (!fontsLoaded) return <View><Text>Loading...</Text></View>;

  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FEF9E7' } }} />
    </AppProvider>
  );
}