import {
  PressStart2P_400Regular,
  useFonts,
} from "@expo-google-fonts/press-start-2p";
import { useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
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
import { btnStyles, COLORS, fieldStyles, texts } from "../constants/theme";
import { auth, db } from "../firebaseConfig";

// 🌟 元件名稱可以維持 AuthScreen 或改成 IndexScreen
export default function AuthScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(false);

  // 字體載入
  let [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  // 驗證邏輯
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("錯誤", "請輸入信箱與密碼！");
      return;
    }
    setLoading(true);
    try {
      if (isLoginMode) {
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const user = userCredential.user;
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          console.log("從資料庫讀取到的資料:", userData);

          if (userData.isSetupComplete === true) {
            router.replace("/home");
          } else {
            router.replace("/setup");
          }
        } else {
          router.replace("/setup");
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const user = userCredential.user;
        await setDoc(
          doc(db, "users", user.uid),
          {
            email: user.email,
            createdAt: serverTimestamp(),
            isSetupComplete: false,
          },
          { merge: true },
        );
        Alert.alert("成功", "註冊成功！請設定您的角色。");
        router.replace("/setup");
      }
    } catch (error: any) {
      Alert.alert("發生錯誤", error.message);
    } finally {
      setLoading(false);
    }
  };

  // 等待字體載入
  if (!fontsLoaded) return null;

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
          <Image
            source={require("../img/appIcon.png")}
            style={styles.img_appIcon}
          />
          <View style={styles.text_container}>
            <Text style={texts.title2}>
              {isLoginMode
                ? "WELCOME BACK TO\nTHE ADVENTURE!"
                : "WELCOME\nNEW ADVENTURER!"}
            </Text>
            <Text style={texts.subtitle}>
              {isLoginMode ? "請登入以存取冒險紀錄" : "請註冊以加入冒險"}
            </Text>
          </View>
          <View style={styles.signUp_container}>
            <TextInput
              style={fieldStyles.textField}
              placeholder="Email"
              placeholderTextColor="#8D6E63"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              style={fieldStyles.textField}
              placeholder="Password"
              placeholderTextColor="#8D6E63"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Pressable
              onPress={handleAuth}
              disabled={loading} // 🌟 建議：loading 時禁用按鈕，防止重複點擊
              style={({ pressed }) => [
                btnStyles.button_bg,
                pressed && {
                  backgroundColor: COLORS.primary_pressed,
                  transform: [{ translateY: 2 }],
                },
                loading && { opacity: 0.7 },
              ]}
            >
              <Text style={texts.btn_text2}>
                {loading
                  ? "PROCESSING..."
                  : isLoginMode
                    ? "LOGIN ▶"
                    : "SIGN UP ▶"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setIsLoginMode(!isLoginMode)}
              style={({ pressed }) => [
                styles.btn_signUp_subtitle,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.signUp_subtitle}>
                {isLoginMode
                  ? "新來的冒險家？點此註冊"
                  : "已經有帳號了？點此登入"}
              </Text>
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
    paddingHorizontal: 50,
    paddingVertical: 40,
    gap: 40,
  },
  img_appIcon: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.bg2,
    borderWidth: 2,
    borderColor: COLORS.line,
    borderRadius: 5,
    shadowColor: COLORS.line,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  text_container: {
    alignItems: "center",
    gap: 5,
  },
  signUp_container: {
    backgroundColor: COLORS.bg2,
    width: "100%",
    height: "auto",
    borderWidth: 2,
    borderColor: COLORS.line,
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: "center",
    shadowColor: COLORS.line,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
    gap: 20,
  },
  btn_signUp_subtitle: {
    paddingTop: 20,
  },
  signUp_subtitle: {
    fontSize: 12,
    color: COLORS.line2,
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
});
