import { Tabs } from "expo-router";
import { useState } from "react";
import { Image } from "react-native"; // 🌟 記得引入 Image
import SideMenu from "../../components/SideMenu";
import { MenuProvider } from "../../content/MenuContext";

export default function TabLayout() {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <MenuProvider onOpen={() => setMenuVisible(true)}>
      <Tabs screenOptions={{ headerShown: false /* ...其他設定... */ }}>
        <Tabs.Screen
          name="adventure"
          options={{
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../img/icon_compass.png")} // 🌟 改成妳的圖片路徑
                style={{ width: 22, height: 22 }}
                resizeMode="contain" // 🌟 確保圖片完整顯示，不被裁切
              />
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../img/icon_map.png")} // 🌟 改成妳的圖片路徑
                style={{ width: 22, height: 22 }}
                resizeMode="contain" // 🌟 確保圖片完整顯示，不被裁切
              />
            ),
          }} />
        <Tabs.Screen
          name="backpack"
          options={{
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../img/icon_backpack.png")} // 🌟 改成妳的圖片路徑
                style={{ width: 22, height: 22 }}
                resizeMode="contain" // 🌟 確保圖片完整顯示，不被裁切
              />
            ),
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../img/icon_wallet.png")} // 🌟 改成妳的圖片路徑
                style={{ width: 22, height: 22 }}
                resizeMode="contain" // 🌟 確保圖片完整顯示，不被裁切
              />
            ),
          }}
        />
        <Tabs.Screen
          name="team"
          options={{
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../img/icon_team.png")} // 🌟 改成妳的圖片路徑
                style={{ width: 22, height: 22 }}
                resizeMode="contain" // 🌟 確保圖片完整顯示，不被裁切
              />
            ),
          }}
        />
      </Tabs>
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </MenuProvider>
  );
}
