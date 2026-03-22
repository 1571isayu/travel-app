import { Stack } from "expo-router";
import React from "react";
// 🌟 確保引入套件
import { KeyboardProvider } from "react-native-keyboard-controller";

export default function RootLayout() {
  return (
    // 🌟 用 KeyboardProvider 包裹整個 Stack 實作全域鍵盤控制
    <KeyboardProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* 1. 不需要列出 index, start, auth, setup, home, (tabs) 
           Expo Router 會自動根據檔案路徑幫你生成路由。
        */}

        {/* 2. 只有需要「特殊設定」的頁面才要寫出來 */}
        {/* 如果你還沒建立 app/modals/add-plan.tsx，請先將下面這段註解掉以消除警告 */}
        <Stack.Screen
          name="modals/add-plan"
          options={{
            presentation: "modal", // 讓它是由下往上滑出的呈現方式
            headerShown: false,
          }}
        />
      </Stack>
    </KeyboardProvider>
  );
}
