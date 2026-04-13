import { btnStyles, COLORS, texts } from "@/constants/theme";
import {
  PressStart2P_400Regular,
  useFonts,
} from "@expo-google-fonts/press-start-2p";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router"; // 🌟 引入參數 Hook
import { doc, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "../firebaseConfig";

//角色清單
const characterList = [
  { id: "bear", uri: require("../character/character_bear.gif") },
  { id: "cat", uri: require("../character/character_cat.gif") },
];

export default function SetupScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams(); // 🌟 獲取是 'edit' 還是新手註冊
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [realIndex, setRealIndex] = useState(0);

  let [fontsLoaded] = useFonts({ PressStart2P_400Regular });

  // 🌟 核心功能：如果是編輯模式，自動載入目前的使用者資料
  useEffect(() => {
    const loadCurrentProfile = async () => {
      if (mode === "edit") {
        const stored = await AsyncStorage.getItem("@user_profile");
        if (stored) {
          const { name: oldName, avatar: oldAvatarUri } = JSON.parse(stored);
          setName(oldName);
          // 比對目前頭像 URI，找到對應的 Index
          const idx = characterList.findIndex(
            (a) => Image.resolveAssetSource(a.uri).uri === oldAvatarUri,
          );
          if (idx !== -1) setRealIndex(idx);
        }
      }
    };
    loadCurrentProfile();
  }, [mode]);

  // 直接切換索引，不使用動畫
  const goToNext = () =>
    setRealIndex((prev) => (prev + 1) % characterList.length);
  const goToPrev = () =>
    setRealIndex(
      (prev) => (prev - 1 + characterList.length) % characterList.length,
    );

  const handleSaveProfile = async () => {
    if (!name.trim()) return Alert.alert("提示", "請輸入名稱！");
    const user = auth.currentUser;

    setLoading(true);
    try {
      const avatarUri = Image.resolveAssetSource(
        characterList[realIndex].uri,
      ).uri;

      // 1. 同步 Firebase
      if (user) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            displayName: name,
            photoURL: avatarUri,
            updatedAt: new Date(),
            isSetupComplete: true,
          },
          { merge: true },
        );
      }

      // 2. 同步本機 AsyncStorage (給 SideMenu 用)
      await AsyncStorage.setItem(
        "@user_profile",
        JSON.stringify({ name, avatar: avatarUri }),
      );

      // 3. 🌟 根據模式跳轉
      if (mode === "edit") {
        Alert.alert("成功", "資料已更新！");
        router.back(); // 編輯完，回上一頁
      } else {
        router.replace("/home"); // 第一次註冊完，去主頁
      }
    } catch (error) {
      console.error(error);
      Alert.alert("存檔失敗");
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded)
    return (
      <ActivityIndicator size="large" color="#5E433B" style={{ flex: 1 }} />
    );

  return (
    <SafeAreaView style={styles.auth_content}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.innerContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={false}
        >
          <View style={styles.top_text}>
            <Text style={texts.title2}>
              {mode === "edit" ? "EDIT PROFILE" : "CHARACTER SELECT"}
            </Text>
            <Text style={texts.subtitle}>
              {mode === "edit" ? "修改你的角色資料" : "選擇你的角色"}
            </Text>
          </View>

          {/* 角色顯示區域：移除所有外框，放大角色 */}
          <View style={styles.character_list}>
            <Pressable
              onPress={goToPrev}
              style={({ pressed }) => [
                // 依然保留微幅下移的動感
                pressed && { transform: [{ translateY: 2 }] },
              ]}
            >
              {({ pressed }) => (
                <View>
                  {/* 1. 平常顯示的箭頭 */}
                  <Image
                    source={require("../img/caret_left.png")}
                    style={[
                      styles.caret,
                      { opacity: pressed ? 0 : 1 }, // 🌟 按下時隱藏
                    ]}
                  />

                  {/* 2. 按下時顯示的箭頭 (絕對定位疊在上面) */}
                  <Image
                    source={require("../img/caret_left_pressed.png")}
                    style={[
                      styles.caret,
                      styles.caret_absolute,
                      { opacity: pressed ? 1 : 0 }, // 🌟 按下時顯示
                    ]}
                  />
                </View>
              )}
            </Pressable>
            <View style={styles.img_container}>
              <Image
                source={characterList[realIndex].uri}
                style={styles.img_character}
                resizeMode="contain"
              />
            </View>

            <Pressable
              onPress={goToNext}
              style={({ pressed }) => [
                // 依然保留微幅下移的動感
                pressed && { transform: [{ translateY: 2 }] },
              ]}
            >
              {({ pressed }) => (
                <View>
                  {/* 1. 平常顯示的箭頭 */}
                  <Image
                    source={require("../img/caret_right.png")}
                    style={[
                      styles.caret,
                      { opacity: pressed ? 0 : 1 }, // 🌟 按下時隱藏
                    ]}
                  />

                  {/* 2. 按下時顯示的箭頭 (絕對定位疊在上面) */}
                  <Image
                    source={require("../img/caret_right_pressed.png")}
                    style={[
                      styles.caret,
                      styles.caret_absolute,
                      { opacity: pressed ? 1 : 0 }, // 🌟 按下時顯示
                    ]}
                  />
                </View>
              )}
            </Pressable>
          </View>

          <View style={styles.enter_container}>
            <Text style={texts.title2}>ENTER NAME</Text>
            <View style={styles.enter_text}>
              <TextInput
                style={[texts.subtitle2, styles.text_input_style]}
                placeholder="請在此輸入你的名稱"
                placeholderTextColor="#8D6E63"
                value={name}
                onChangeText={setName}
                maxLength={10}
              />

              <Image
                source={require("../img/enter_line.png")}
                style={styles.enter_line}
              />
            </View>
            <Pressable
              onPress={handleSaveProfile}
              disabled={loading}
              style={({ pressed }) => [
                btnStyles.button_bg,
                pressed && {
                  backgroundColor: COLORS.primary_pressed,
                  transform: [{ translateY: 2 }],
                },
              ]}
            >
              <Text style={texts.btn_text2}>SAVE ▶</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  auth_content: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  innerContainer: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  top_text: {
    width: "100%",
    gap: 5,
    alignItems: "center",
  },
  character_list: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // 改為居中
    width: "100%", // 改為滿寬
    height: 250, // 稍微縮小高度確保 iPhone SE 等小手機也放得下
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  caret_wrapper: {
    width: 50, // 給予明確的點擊區域寬度
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10, // 確保箭頭在最上層
  },
  caret_inner: {
    width: 30,
    height: 30,
    position: "relative",
  },
  caret: {
    width: 30,
    height: 30,
    resizeMode: "contain",
  },
  caret_absolute: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  img_container: {
    flex: 1, // 讓角色圖佔據剩餘空間
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  img_character: {
    width: 180, // 限制角色寬度避免擠壓箭頭
    height: "100%",
  },
  enter_container: {
    backgroundColor: COLORS.bg2,
    width: 280,
    height: "auto",
    gap: 20,
    borderWidth: 2,
    borderColor: COLORS.line,
    paddingHorizontal: 26,
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: COLORS.line,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },

  enter_text: {
    width: "100%",
    alignItems: "center",
  },
  text_input_style: {
    textAlign: "center",
    paddingBottom: 0, // 🌟 關鍵：強制文字貼近底部
    minWidth: "100%",
  },

  enter_line: {
    width: "100%",
    resizeMode: "contain",
  },
});
