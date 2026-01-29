import { Tabs } from 'expo-router';
import { Map, Backpack, Wallet, Users } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: '#5D4037', 
          borderTopWidth: 4, 
          borderTopColor: '#000',
          height: 60,
          paddingBottom: 5
        },
        tabBarActiveTintColor: '#F4D03F', // 選中變黃色皮克敏
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarLabelStyle: { fontFamily: 'PressStart2P_400Regular', fontSize: 10 }
      }}
    >
      <Tabs.Screen name="adventure" options={{ title: '冒險', tabBarIcon: ({color}) => <Map color={color} size={20} /> }} />
      <Tabs.Screen name="backpack" options={{ title: '背包', tabBarIcon: ({color}) => <Backpack color={color} size={20} /> }} />
      <Tabs.Screen name="wallet" options={{ title: '錢包', tabBarIcon: ({color}) => <Wallet color={color} size={20} /> }} />
      <Tabs.Screen name="team" options={{ title: '隊伍', tabBarIcon: ({color}) => <Users color={color} size={20} /> }} />
    </Tabs>
  );
}