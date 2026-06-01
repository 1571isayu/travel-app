import { Tabs } from "expo-router";
import { Image, Platform, StyleSheet, View } from "react-native";

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
            <View style={[styles.iconWrapper, focused && styles.iconPressed]}>
              <Image
                source={
                  focused
                    ? require("../../img/icon_compass_active.png") // 👈 🌟 選中時：有黃色圓底的圖片
                    : require("../../img/icon_compass.png")        // 👈 未選中時：原本的線稿圖片
                }
                style={styles.tabIcon}
                resizeMode="contain"
              />
            </View>
          ),

        }}
      />

      <Tabs.Screen
        name="backpack"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconPressed]}>
              <Image
                source={
                  focused
                    ? require("../../img/icon_backpack_active.png") // 👈 選中時的圖案
                    : require("../../img/icon_backpack.png")
                }
                style={styles.tabIcon}
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconPressed]}>
              <Image
                source={
                  focused
                    ? require("../../img/icon_wallet_active.png")   // 👈 選中時的圖案
                    : require("../../img/icon_wallet.png")
                }
                style={styles.tabIcon}
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          tabBarIcon: ({ focused }) => (
            <View style={[styles.iconWrapper, focused && styles.iconPressed]}>
              <Image
                source={
                  focused
                    ? require("../../img/icon_user_active.png")     // 👈 選中時的圖案
                    : require("../../img/icon_user.png")
                }
                style={styles.tabIcon}
                resizeMode="contain"
              />
            </View>
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
const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: "#F5EFE6", // 👈 完全對齊你的米色溫暖背景
    borderTopWidth: 3,         // 👈 標誌性的扎實像素黑邊框線
    borderTopColor: "#4A342E",  
    height: Platform.OS === "ios" ? 85 : 65, // 兼顧 iOS 底部安全區域
    paddingBottom: Platform.OS === "ios" ? 25 : 10,
    paddingTop: 10,
  },
  tabIcon: {
    width: 26, // 👈 稍微放大一點點，在手機上圖標細節更清晰
    height: 26,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
  },
  // 🌟 核心動畫：選中時的像素風微下沉與微縮放回饋（Neubrutalism 手感）
  iconPressed: {
    transform: [{ translateY: -10 }, { scale: 1.2 }], 
  },
});
