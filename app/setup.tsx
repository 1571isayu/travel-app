import { useRouter } from "expo-router";
// 🌟 1. 這裡改成引入 setDoc
import {
  PressStart2P_400Regular,
  useFonts,
} from "@expo-google-fonts/press-start-2p";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../firebaseConfig";
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

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
    if (!name.trim()) return alert("請輸入你的冒險者名稱！");
    const user = auth.currentUser;
    if (!user) return router.replace("/auth"); // 🌟 找不到使用者時退回 auth 頁面

    setLoading(true);
    try {
      // 🌟 2. 這裡改成 setDoc，並加上 { merge: true }
      // 這樣就算資料庫裡還沒有這個人的檔案，也會自動建立，不會報錯！
      await setDoc(
        doc(db, "users", user.uid),
        {
          displayName: name,
          photoURL: selectedAvatar,
          isSetupComplete: true,
          email: user.email, // 順便把 email 存進去
          updatedAt: new Date(),
        },
        { merge: true },
      );

      router.replace("/home");
    } catch (error) {
      console.error(error);
      alert("存檔失敗，請檢查網路或資料庫權限");
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
    <KeyboardAwareScrollView 
      bottomOffset={50} // 讓鍵盤跟輸入框之間留一點空隙，比較美觀
      contentContainerStyle={styles.container} // 保持原本的置中樣式
    >      
      <Text style={styles.title}>CHARACTER SELECT</Text>
      <Text style={styles.subtitle}>—— 選擇你的探險家樣貌 ——</Text>

      <View style={styles.card}>
        {/* 預覽選中的頭像 - 移除虛線，改為實線裝飾 */}
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
          <Text style={styles.buttonText}>
            {loading ? "SAVING..." : "CONFIRM & START"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAwareScrollView>  
    );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFDF0",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 22,
    color: "#4A342E",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    color: "#8D6E63",
    marginBottom: 30,
    fontSize: 14,
    fontWeight: "bold",
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
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 1,
    elevation: 0,
  },
  previewContainer: {
    padding: 10,
    marginBottom: 10,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  previewAvatar: {
    width: 90,
    height: 90,
    transform: [{ scale: 1 }],
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
    gap: 12,
    marginBottom: 20,
  },
  avatarOption: {
    width: 68,
    height: 68,
    backgroundColor: "#FFF",
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
  },
  avatarUnselected: {
    borderColor: "#D7CCC8",
  },
  avatarSelected: {
    borderColor: "#E84A41",
    backgroundColor: "#FFF",
    borderWidth: 4,
    borderRadius: 0,
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
    backgroundColor: "transparent",
    padding: 10,
    fontSize: 18,
    textAlign: "center",
    marginBottom: 35,
    fontFamily: "Courier",
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
