import { Stack } from "expo-router";
import React from "react";
// 🌟 1. 確保引入套件
import { KeyboardProvider } from 'react-native-keyboard-controller'; 

export default function RootLayout() {
  return (
    // 🌟 2. 必須用 KeyboardProvider 包裹整個 Stack
    // 這樣底下的所有頁面（auth, setup 等）才能使用鍵盤控制功能
    <KeyboardProvider>
      <Stack screenOptions={{ headerShown: false }}>
        
        {/* 1. 啟動流程 (Onboarding) */}
        <Stack.Screen name="index" /> 
        <Stack.Screen name="start" /> 
        <Stack.Screen name="auth" /> 
        <Stack.Screen name="setup" /> 

        {/* 2. 主功能區塊 */}
        <Stack.Screen name="home" /> 

        {/* 3. 進入單一冒險後的底部標籤列 (Tabs) */}
        <Stack.Screen name="(tabs)" />

        {/* 4. 彈出視窗 (Modals) */}
        <Stack.Screen
          name="modals/add-plan"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
      </Stack>
    </KeyboardProvider>
  );
}