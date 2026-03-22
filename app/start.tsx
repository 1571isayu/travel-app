import {
  PressStart2P_400Regular,
  useFonts,
} from "@expo-google-fonts/press-start-2p";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export default function StartScreen() {
  const router = useRouter();
  let [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  // 控制 "PRESS START" 閃爍的透明度
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (fontsLoaded) {
      // 讓透明度在 1 和 0 之間來回切換，製造閃爍效果
      opacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1, // -1 代表無限循環
        true,
      );
    }
  }, [fontsLoaded, opacity]);

  const blinkingStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  if (!fontsLoaded) return null;

  return (
    // 點擊整個畫面任何地方都可以進入下一頁
    <Pressable style={styles.container} onPress={() => router.push("/auth")}>
      {/* 🌟 修改：新的空白正方形框，取代之前的圖片 */}
      <View style={styles.coverImageFrame} />

      {/* 🌟 修改：新的標題區，分兩行 */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>WELCOME</Text>
        <Text style={styles.title}>NEW ADVENTURER!</Text>
      </View>

      {/* 閃爍的 PRESS START (保持不變) */}
      <Animated.View style={[styles.startContainer, blinkingStyle]}>
        <Text style={styles.startText}>- PRESS START -</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFDF0",
    alignItems: "center",
    justifyContent: "space-around", // 讓元素均勻分佈
    paddingVertical: 50,
  },
  // 🌟 修改：新的空白正方形框樣式，白色實心、棕色粗邊框
  coverImageFrame: {
    width: 200,
    height: 200,
    backgroundColor: "#FFFFFF",
    borderWidth: 4,
    borderColor: "#4A342E",
    marginTop: 30, // 調整與頂部的間距
  },
  titleContainer: {
    alignItems: "center",
    marginVertical: 10, // 調整與框的間距
  },
  title: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 16, // 🌟 修改：縮小字體以匹配新文字
    color: "#4A342E",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
    lineHeight: 24, // 🌟 修改：調整行高
    textAlign: "center", // 🌟 新增：確保文字置中
  },
  startContainer: {
    marginBottom: 20,
  },
  startText: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 16,
    color: "#E84A41", // 醒目的紅色
    marginBottom: 50,
  },
});
