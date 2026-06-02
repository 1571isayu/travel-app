import { btnStyles, COLORS, texts } from "@/constants/theme";
import {
  PressStart2P_400Regular,
  useFonts,
} from "@expo-google-fonts/press-start-2p";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  const { mode } = useLocalSearchParams();
  
  const [name, setName] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [realIndex, setRealIndex] = useState(0); 

  let [fontsLoaded] = useFonts({ PressStart2P_400Regular });

  // 🌟 核心功能修改：相容舊的欄位與新的 ID 欄位比對
  useEffect(() => {
    const loadCurrentProfile = async () => {
      if (mode === "edit") {
        const stored = await AsyncStorage.getItem("@user_profile");
        if (stored) {
          const profile = JSON.parse(stored);
          setName(profile.name);
          
          // 優先用我們新加的 characterId 比對，如果沒有，再退回用舊的 avatarUri 比對
          let idx = -1;
          if (profile.characterId) {
            idx = characterList.findIndex((a) => a.id === profile.characterId);
          } else if (profile.avatar) {
            idx = characterList.findIndex(
              (a) => Image.resolveAssetSource(a.uri).uri === profile.avatar,
            );
          }
          
          if (idx !== -1) setRealIndex(idx);
        }
      }
    };
    loadCurrentProfile();
  }, [mode]);

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
      // 🌟 拿到當前選中角色的「純字串 ID」（例如 "bear" 或 "cat"）
      const charId = characterList[realIndex].id;

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
            characterId: charId, // 🔴 追加儲存角色純字串 ID 給隊伍頁看！
            updatedAt: new Date(),
            isSetupComplete: true,
          },
          { merge: true },
        );
      }

      // 2. 同步本機 AsyncStorage
      await AsyncStorage.setItem(
        "@user_profile",
        JSON.stringify({ 
          name, 
          avatar: avatarUri, 
          characterId: charId // 🔴 本機也一併存入字串 ID
        }),
      );

      // 3. 根據模式跳轉
      if (mode === "edit") {
        Alert.alert("成功", "資料已更新！");
        router.back(); 
      } else {
        router.replace("/home"); 
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

          <View style={styles.character_list}>
            <Pressable
              onPress={goToPrev}
              style={({ pressed }) => [
                pressed && { transform: [{ translateY: 2 }] },
              ]}
            >
              {({ pressed }) => (
                <View>
                  <Image
                    source={require("../img/caret_left.png")}
                    style={[
                      styles.caret,
                      { opacity: pressed ? 0 : 1 },
                    ]}
                  />
                  <Image
                    source={require("../img/caret_left_pressed.png")}
                    style={[
                      styles.caret,
                      styles.caret_absolute,
                      { opacity: pressed ? 1 : 0 },
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
                pressed && { transform: [{ translateY: 2 }] },
              ]}
            >
              {({ pressed }) => (
                <View>
                  <Image
                    source={require("../img/caret_right.png")}
                    style={[
                      styles.caret,
                      { opacity: pressed ? 0 : 1 },
                    ]}
                  />
                  <Image
                    source={require("../img/caret_right_pressed.png")}
                    style={[
                      styles.caret,
                      styles.caret_absolute,
                      { opacity: pressed ? 1 : 0 },
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
  auth_content: { flex: 1, backgroundColor: COLORS.bg },
  innerContainer: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  top_text: { width: "100%", gap: 5, alignItems: "center" },
  character_list: { flexDirection: "row", alignItems: "center", justifyContent: "center", width: "100%", height: 250, marginVertical: 20, paddingHorizontal: 10 },
  caret: { width: 30, height: 30, resizeMode: "contain" },
  caret_absolute: { position: "absolute", top: 0, left: 0 },
  img_container: { flex: 1, height: "100%", justifyContent: "center", alignItems: "center" },
  img_character: { width: 180, height: "100%" },
  enter_container: { backgroundColor: COLORS.bg2, width: 280, height: "auto", gap: 20, borderWidth: 2, borderColor: COLORS.line, paddingHorizontal: 26, paddingVertical: 30, alignItems: "center", justifyContent: "space-between", shadowColor: COLORS.line, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  enter_text: { width: "100%", alignItems: "center" },
  text_input_style: { textAlign: "center", paddingBottom: 0, minWidth: "100%" },
  enter_line: { width: "100%", resizeMode: "contain" },
});