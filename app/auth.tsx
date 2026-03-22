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
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  // 🌟 修改：引入內建元件
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { auth, db } from "../firebaseConfig";

export default function AuthScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(false);

  let [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("錯誤", "請輸入信箱與密碼！");
      return;
    }
    setLoading(true);
    try {
      if (isLoginMode) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().isSetupComplete) {
          router.replace("/home");
        } else {
          router.replace("/setup");
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          createdAt: serverTimestamp(),
          isSetupComplete: false,
        }, { merge: true });
        Alert.alert("成功", "註冊成功！請設定您的角色。");
        router.replace("/setup");
      }
    } catch (error: any) {
      Alert.alert("發生錯誤", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) return null;

  return (
    // 🌟 修改 1：使用內建 KeyboardAvoidingView 解決報錯
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* 🌟 修改 2：使用 ScrollView 包裹內容，確保鍵盤彈起時可捲動 */}
      <ScrollView 
        contentContainerStyle={styles.innerContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconBox} />

        <Text style={styles.mainTitle}>
          {isLoginMode
            ? "WELCOME BACK TO\nTHE ADVENTURE!"
            : "WELCOME\nNEW ADVENTURER!"}
        </Text>
        <Text style={styles.subTitle}>
          {isLoginMode ? "請登入以存取冒險紀錄" : "請註冊以加入冒險"}
        </Text>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#8D6E63"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#8D6E63"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isLoginMode ? "LOGIN" : "SIGN UP"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchModeBtn}
            onPress={() => setIsLoginMode(!isLoginMode)}
          >
            <Text style={styles.switchModeText}>
              {isLoginMode ? "新來的冒險家？點此註冊" : "已經有帳號了？點此登入"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFDF0",
  },
  innerContainer: {
    // 🌟 使用 flexGrow 確保內容垂直置中且可捲動
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  iconBox: {
    width: 70,
    height: 70,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#4A342E",
    borderRadius: 6,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 4,
  },
  mainTitle: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 14,
    color: "#4A342E",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 10,
  },
  subTitle: {
    fontSize: 12,
    color: "#8D6E63",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 25,
  },
  card: {
    backgroundColor: "white",
    width: "100%",
    maxWidth: 320,
    borderWidth: 2,
    borderColor: "#4A342E",
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 5,
  },
  input: {
    width: "100%",
    backgroundColor: "#FFFDF0",
    borderWidth: 2,
    borderColor: "#4A342E",
    padding: 12,
    marginBottom: 20,
    fontSize: 14,
    fontWeight: "bold",
    color: "#4A342E",
  },
  actionButton: {
    backgroundColor: "#E84A41",
    width: "100%",
    paddingVertical: 15,
    borderWidth: 2,
    borderColor: "#4A342E",
    alignItems: "center",
    marginTop: 5,
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 3,
  },
  buttonText: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 14,
    color: "#FFF",
  },
  switchModeBtn: {
    marginTop: 25,
    padding: 10,
  },
  switchModeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#8D6E63",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});