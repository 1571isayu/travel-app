import { Tabs } from 'expo-router';
import { Backpack, Map, Users, Wallet } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: '#5D4037', // 深褐色底
          borderTopWidth: 4, 
          borderTopColor: '#000',
          height: 70, // 稍微加高一點，手機按起來比較順手
          paddingBottom: 12,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#F4D03F', // 選中變黃色
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarLabelStyle: { 
          fontFamily: 'PressStart2P_400Regular', 
          fontSize: 8, // 像素字體較寬，縮小一點避免折行
          marginTop: 4 
        }
      }}
    >
      {/* 1. 冒險 */}
      <Tabs.Screen 
        name="adventure" 
        options={{ 
          title: '冒險', 
          tabBarIcon: ({color}) => <Map color={color} size={22} /> 
        }} 
      />

      {/* 2. 背包 */}
      <Tabs.Screen 
        name="backpack" 
        options={{ 
          title: '背包', 
          tabBarIcon: ({color}) => <Backpack color={color} size={22} /> 
        }} 
      />

      {/* 3. 錢包 */}
      <Tabs.Screen 
        name="wallet" 
        options={{ 
          title: '錢包', 
          tabBarIcon: ({color}) => <Wallet color={color} size={22} /> 
        }} 
      />

      {/* 4. 隊伍 */}
      <Tabs.Screen 
        name="team" 
        options={{ 
          title: '隊伍', 
          tabBarIcon: ({color}) => <Users color={color} size={22} /> 
        }} 
      />

      {/* --- 關鍵：強制隱藏任何可能誤入的頁面 --- */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="home" options={{ href: null }} />
      <Tabs.Screen name="setup" options={{ href: null }} />
    </Tabs>
  );
}