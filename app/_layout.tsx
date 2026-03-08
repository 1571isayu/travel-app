import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    // 使用 Stack 而不是 Tabs，這樣外層就不會有底部分頁欄
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="setup" />
      <Stack.Screen name="home" />
      
      {/* (tabs) 分組會自動尋找其內部的 _layout.tsx (即 Tabs) */}
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
    </Stack>
  );
}