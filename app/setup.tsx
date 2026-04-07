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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../firebaseConfig";

const AVATARS = [
  { id: "red", uri: require("../pikmin/red.jpg") },
  { id: "blue", uri: require("../pikmin/blue.jpg") },
  { id: "yellow", uri: require("../pikmin/yellow.jpg") },
  { id: "dark-blue", uri: require("../pikmin/dark-blue.jpg") },
  { id: "pink", uri: require("../pikmin/pink.jpg") },
  { id: "purple", uri: require("../pikmin/purple.jpg") },
  { id: "stone", uri: require("../pikmin/stone.jpg") },
  { id: "white", uri: require("../pikmin/white.jpg") },
];

export default function SetupScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams(); // 🌟 獲取是 'edit' 還是新手註冊
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentAvatarIndex, setCurrentAvatarIndex] = useState(0);

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
          const idx = AVATARS.findIndex(
            (a) => Image.resolveAssetSource(a.uri).uri === oldAvatarUri,
          );
          if (idx !== -1) setCurrentAvatarIndex(idx);
        }
      }
    };
    loadCurrentProfile();
  }, [mode]);

  const currentAvatar = AVATARS[currentAvatarIndex];

  const goToPrevAvatar = () =>
    setCurrentAvatarIndex((prev) =>
      prev === 0 ? AVATARS.length - 1 : prev - 1,
    );
  const goToNextAvatar = () =>
    setCurrentAvatarIndex((prev) =>
      prev === AVATARS.length - 1 ? 0 : prev + 1,
    );

  const handleSaveProfile = async () => {
    if (!name.trim()) return Alert.alert("提示", "請輸入名稱！");
    const user = auth.currentUser;

    setLoading(true);
    try {
      const avatarUri = Image.resolveAssetSource(currentAvatar.uri).uri;

      // 1. 同步 Firebase
      if (user) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            displayName: name,
            photoURL: avatarUri,
            updatedAt: new Date(),
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.mainContainer}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerAreaContainer}>
          <Text style={styles.titleText}>
            {mode === "edit" ? "EDIT PROFILE" : "CHARACTER SELECT"}
          </Text>
          <Text style={styles.subtitleText}>
            {mode === "edit" ? "修改你的角色資料" : "選擇你的角色"}
          </Text>
        </View>

        <View style={styles.selectorRow}>
          <TouchableOpacity
            onPress={goToPrevAvatar}
            style={styles.triangleButton}
          >
            <Image
              source={require("../img/caret_left.png")}
              style={styles.arrowImage}
            />
          </TouchableOpacity>

          <View style={styles.avatarFrameLarge}>
            <Image source={currentAvatar.uri} style={styles.largeAvatarImg} />
          </View>

          <TouchableOpacity
            onPress={goToNextAvatar}
            style={styles.triangleButton}
          >
            <Image
              source={require("../img/caret_right.png")}
              style={styles.arrowImage}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.lowerAreaBoxContainer}>
          <View style={styles.lowerInfoBox}>
            <Text style={styles.internalLabelText}>ENTER NAME</Text>
            <View style={styles.internalInputWrapper}>
              <TextInput
                style={styles.lineInputInternal}
                placeholder="請輸入名稱"
                value={name}
                onChangeText={setName}
                maxLength={10}
              />
              <Image
                source={require("../img/enter_line.png")}
                style={styles.wavyLineImage}
              />
            </View>

            <TouchableOpacity
              style={styles.internalConfirmArea}
              onPress={handleSaveProfile}
              disabled={loading}
            >
              <View style={styles.internalConfirmButton}>
                {loading ? (
                  <ActivityIndicator color="#4A342E" />
                ) : (
                  <Text style={styles.internalConfirmText}>SAVE</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ... styles 保持與你原本的一樣 ...
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F4F0E8" },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    padding: 20,
    justifyContent: "center",
    alignContent: "center",
  },
  headerAreaContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 40,
  },
  titleText: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 16,
    color: "#5E433B",
    marginBottom: 10,
  },
  subtitleText: { color: "#8D6E63", fontSize: 14, fontWeight: "bold" },
  selectorRow: { flexDirection: "row", alignItems: "center", gap: 15 },
  triangleButton: { padding: 10 },
  arrowImage: { width: 32, height: 32, resizeMode: "contain" },
  avatarFrameLarge: {
    width: 200,
    height: 200,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#5E433B",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  largeAvatarImg: { width: "80%", height: "80%", resizeMode: "contain" },
  lowerAreaBoxContainer: { width: "100%", alignItems: "center", marginTop: 40 },
  lowerInfoBox: {
    width: 260,
    height: 180,
    backgroundColor: "#FFFFFF",
    borderWidth: 2.2,
    borderColor: "#5E433B",
    padding: 15,
    alignItems: "center",
    justifyContent: "space-between",
  },
  internalLabelText: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 14,
    color: "#5E433B",
    marginTop: 10,
  },
  internalInputWrapper: { width: "100%", alignItems: "center" },
  lineInputInternal: {
    width: "90%",
    fontSize: 16,
    textAlign: "center",
    color: "#5E433B",
  },
  wavyLineImage: { width: "90%", height: 5, resizeMode: "stretch" },
  internalConfirmArea: { width: "100%", marginBottom: 10 },
  internalConfirmButton: {
    height: 40,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#5E433B",
    justifyContent: "center",
    alignItems: "center",
  },
  internalConfirmText: {
    fontFamily: "PressStart2P_400Regular",
    color: "#5E433B",
    fontSize: 12,
  },
});
