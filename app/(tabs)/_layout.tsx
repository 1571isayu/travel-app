import { Tabs } from "expo-router";
import { Image } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="adventure"
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../../img/icon_compass.png")}
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="backpack"
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../../img/icon_backpack.png")}
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../../img/icon_wallet.png")}
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("../../img/icon_team.png")}
              style={{ width: 22, height: 22 }}
              resizeMode="contain"
            />
          ),
        }}
      />

      {/* 🌟 加上這段：明確將 map 頁面從 nav-bar 隱藏 */}
      <Tabs.Screen
        name="map"
        options={{
          href: null, // 這行是關鍵，會徹底隱藏底部圖標，但保留路由跳轉功能
        }}
      />
    </Tabs>
  );
}
