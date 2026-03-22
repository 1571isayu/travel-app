import {
  PressStart2P_400Regular,
  useFonts,
} from "@expo-google-fonts/press-start-2p";
import { useRouter } from "expo-router";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  // 🌟 修改：換成內建相容元件
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
  const [name, setName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].uri);
  const [loading, setLoading] = useState(false);

  let [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  const handleSaveProfile = async () => {
    if (!name.trim()) return Alert.alert("錯誤", "請輸入你的冒險者名稱！");
    const user = auth.currentUser;
    if (!user) return router.replace("/auth");

    setLoading(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: name,
          photoURL: selectedAvatar,
          isSetupComplete: true,
          email: user.email,
          updatedAt: new Date(),
        },
        { merge: true },
      );
      router.replace("/home");
    } catch (error) {
      console.error(error);
      Alert.alert("存檔失敗", "請檢查網路或資料庫權限");
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <ActivityIndicator size="large" color="#4A342E" style={{ flex: 1 }} />
    );
  }

  return (
    // 🌟 修改 1：使用 KeyboardAvoidingView
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.mainContainer}
    >
      {/* 🌟 修改 2：使用 ScrollView，解決頭像過多導致小螢幕被裁切的問題 */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>CHARACTER SELECT</Text>
        <Text style={styles.subtitle}>—— 選擇你的探險家樣貌 ——</Text>

        <View style={styles.card}>
          <View style={styles.previewContainer}>
            <View
              style={[
                styles.avatarOption,
                styles.avatarSelected,
                styles.previewAvatar,
              ]}
            >
              <Image source={selectedAvatar} style={styles.avatarImg} />
            </View>
          </View>

          <Text style={styles.label}>CHOOSE AVATAR</Text>
          <View style={styles.avatarGrid}>
            {AVATARS.map((avatar) => (
              <TouchableOpacity
                key={avatar.id}
                onPress={() => setSelectedAvatar(avatar.uri)}
                style={[
                  styles.avatarOption,
                  selectedAvatar === avatar.uri
                    ? styles.avatarSelected
                    : styles.avatarUnselected,
                ]}
              >
                <Image source={avatar.uri} style={styles.avatarImg} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>ENTER NAME</Text>
          <TextInput
            style={styles.lineInput}
            placeholder="請在此輸入名稱"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#A1887F"
            maxLength={10}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSaveProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>CONFIRM & START</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // 🌟 修改：確保外層容器填滿
  mainContainer: {
    flex: 1,
    backgroundColor: "#FFFDF0",
  },
  scrollContent: {
    // 🌟 重要：使用 flexGrow 確保置中且內容多時可滾動
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    paddingTop: 60, // 給頂部留一點空間
    paddingBottom: 40,
  },
  title: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 20, // 稍微調小一點點避免溢出
    color: "#4A342E",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    color: "#8D6E63",
    marginBottom: 30,
    fontSize: 12, // 縮小副標題
    fontWeight: "bold",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: 400,
    borderWidth: 4,
    borderColor: "#4A342E",
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.2,
    elevation: 0,
  },
  previewContainer: {
    padding: 10,
    marginBottom: 10,
    alignItems: "center",
  },
  previewAvatar: {
    width: 90,
    height: 90,
  },
  label: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 10,
    marginTop: 15,
    marginBottom: 15,
    color: "#4A342E",
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  avatarOption: {
    width: 60, // 縮小一點，讓網格更緊湊
    height: 60,
    backgroundColor: "#FFF",
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarUnselected: {
    borderColor: "#D7CCC8",
  },
  avatarSelected: {
    borderColor: "#E84A41",
    backgroundColor: "#FFF",
    borderWidth: 4,
  },
  avatarImg: {
    width: "85%",
    height: "85%",
    resizeMode: "contain",
  },
  lineInput: {
    width: "90%",
    borderBottomWidth: 3,
    borderBottomColor: "#4A342E",
    padding: 10,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 35,
    color: "#3E2723",
  },
  button: {
    backgroundColor: "#2ecc71",
    width: "100%",
    padding: 18,
    borderWidth: 3,
    borderColor: "#000",
    borderBottomWidth: 8,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "PressStart2P_400Regular",
    color: "white",
    fontSize: 12,
  },
});
