import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { AppProvider } from "../context/AppContext";
import { ThemeProvider } from "../context/ThemeContext";
//修
// 阻止啟動畫面自動隱藏，直到字體準備好
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // 🌟 這裡填入妳定義的名字與檔案路徑
    PressStart2P: require("../assets/fonts/PressStart2P-Regular.ttf"),
    Cubic11: require("../assets/fonts/Cubic_11.ttf"),
  });

  useEffect(() => {
    if (loaded || error) {
      // 字體載入完成（或出錯）後，隱藏啟動畫面
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null; // 或者回傳一個簡單的 Loading 畫面
  }

  return (
    <ThemeProvider>
      <AppProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AppProvider>
    </ThemeProvider>
  );
}
