import { Tabs } from "expo-router";
import { useState } from "react";
import SideMenu from "../../components/SideMenu";
import { MenuProvider } from "../../content/MenuContext";

export default function TabLayout() {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <MenuProvider onOpen={() => setMenuVisible(true)}>
      <Tabs screenOptions={{ headerShown: false /* ...其他設定... */ }}>
        <Tabs.Screen name="adventure" />
        <Tabs.Screen name="map" />
        <Tabs.Screen name="backpack" />
        <Tabs.Screen name="wallet" />
        <Tabs.Screen name="team" />
      </Tabs>
      <SideMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </MenuProvider>
  );
}
