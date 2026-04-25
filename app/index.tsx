import {
  PressStart2P_400Regular,
  useFonts,
} from "@expo-google-fonts/press-start-2p";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export default function LoadingScreen() {
  const router = useRouter();
  let [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  // 控制進度條的寬度 (0 到 100)
  const progress = useSharedValue(0);

  useEffect(() => {
    // 當字體載入完成後，開始跑進度條
    if (fontsLoaded) {
      progress.value = withTiming(100, {
        duration: 2000, // 動畫跑 2 秒
        easing: Easing.linear, //線性動畫
      });

      // 2.5 秒後自動跳轉到開始畫面
      //用replace 不是push 是因為他不會跳轉回來
      const timer = setTimeout(() => {
        router.replace("/start");
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, progress, router]);

  // 動態改變進度條寬度的樣式
  const animatedBarStyle = useAnimatedStyle(() => {
    return {
      width: `${progress.value}%`,
      height: "100%",
      backgroundColor: "#8D6E63", // 進度條填滿的顏色
    };
  });

  if (!fontsLoaded) {
    return null; // 字體還沒載入前先畫面全白，避免閃爍
  }

  return (
    <View style={styles.container}>
      <Text style={styles.loadingText}>LOADING...</Text>

      {/* 進度條外框 */}
      <View style={styles.progressBarContainer}>
        {/* 會動的進度條 */}
        <Animated.View style={animatedBarStyle} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F0E8",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 16,
    color: "#5E433B",
    marginBottom: 10,
    letterSpacing: 2,
  },
  progressBarContainer: {
    width: "70%", // 進度條的總寬度
    height: 15, // 進度條的高度
    borderWidth: 2,
    borderColor: "#5E433B",
    backgroundColor: "#FFFFFF",
    overflow: "hidden", // 讓填滿的顏色不會超出外框
  },
});
