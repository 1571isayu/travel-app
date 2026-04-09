import { useApp } from "@/context/AppContext";
import {
  PressStart2P_400Regular,
  useFonts,
} from "@expo-google-fonts/press-start-2p";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { btnStyles, COLORS, texts } from "../constants/theme";



export default function StartScreen() {
  const router = useRouter();
  //字體載入
  let [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  //字體沒載入前不渲染
  if (!fontsLoaded) return null;
  const { theme, isDark, toggleTheme } = useApp();
  return (

    <SafeAreaView style={styles.start_content} >
      {/*APPIcon圖片*/}
      <View style={styles.img_appIcon} />

      <View style={styles.bottom_container}>
        {/*title*/}
        <Text style={texts.title}>
          WELCOME{"\n"}NEW ADVENTURER!
        </Text>
        {/*btn*/}
        <Pressable
          onPress={() => router.push("/auth")}
          style={({ pressed }) => [
            btnStyles.button_bg,
            pressed && { backgroundColor: "#D6631D", transform: [{ translateY: 2 }] }
          ]}
        >
          <Text style={texts.btn_text}>START</Text>
        </Pressable>
      </View>

    </SafeAreaView>
  );
}

// --- 🎨 樣式表 ---
const styles = StyleSheet.create({

  start_content: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 120,
    paddingHorizontal: 60,

  },
  img_appIcon: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: COLORS.bg2,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 5,
    shadowColor: "#5E433B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  bottom_container: {
    width: "100%",
    alignItems: "center",
    gap: 20,
  },

});
