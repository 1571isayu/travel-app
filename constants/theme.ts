/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform, StyleSheet } from 'react-native';
const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// 🌟 定義顏色常數
export const COLORS = {
  line: "#5E433B",
  line2: "#8D6E63",
  primary: "#EC7424",
  primary_pressed: "#D6631D",
  secondary: "#F6E3BD",
  disable: "#C5D8BA", // 修正：補上 # 號
  bg: "#F4F0E8",
  bg2: "#FFFDF9",
  white: "#FFFFFF",
};
//文字樣式
export const texts = StyleSheet.create({
  title: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 16,
    color: COLORS.line,
    textShadowColor: "rgba(94, 67, 59, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
    lineHeight: 20,
    textAlign: "center",
  },
  title2: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 12,
    color: COLORS.line,
    textShadowColor: "rgba(94, 67, 59, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
    lineHeight: 20,
    textAlign: "center",
  },
  btn_text: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 16,
    color: COLORS.bg2,
    textShadowColor: "rgba(94, 67, 59, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
    paddingTop: 4,
  },
  btn_text2: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 12,
    color: COLORS.bg2,
    textShadowColor: "rgba(94, 67, 59, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 1,
    paddingTop: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.line2,
    fontWeight: "bold",
  },
  
});


export const btnStyles = StyleSheet.create({
  // 🌟 這就是妳的「通用像素按鈕」基礎樣式
  button_bg: {
    width: "100%",
    height: 55,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 4,
    borderWidth: 2,
    borderColor: COLORS.line,
    shadowColor: COLORS.line,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },


});