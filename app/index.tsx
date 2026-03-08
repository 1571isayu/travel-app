import { PressStart2P_400Regular, useFonts } from '@expo-google-fonts/press-start-2p';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { auth, db } from '../firebaseConfig';

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // 判斷現在是「登入」還是「註冊」模式
  const [isLoginMode, setIsLoginMode] = useState(true);

  let [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  // --- 動畫設定 ---
  const titleTranslateY = useSharedValue(0);
  
  useEffect(() => {
    titleTranslateY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) })
      ),
      -1, 
      true 
    );
  }, []);

  const animatedTitleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const buttonPressed = useSharedValue(false);
  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: buttonPressed.value ? 6 : 0 }], 
      borderBottomWidth: buttonPressed.value ? 0 : 6,           
      marginBottom: buttonPressed.value ? 6 : 0,                
    };
  });

  // --- 驗證邏輯：註冊後自動登入並跳轉 ---
  const handleAuth = async () => {
    if (!email || !password) {
      alert("請輸入信箱與密碼！");
      return;
    }

    setLoading(true);
    try {
      let user;
      
      if (isLoginMode) {
        // 【登入模式】
        const result = await signInWithEmailAndPassword(auth, email, password);
        user = result.user;
      } else {
        // 【註冊模式】Firebase 建立帳號成功後，會「自動」幫使用者登入！
        const result = await createUserWithEmailAndPassword(auth, email, password);
        user = result.user;
      }

      // 檢查或建立 Firestore 中的使用者資料
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // 新註冊的帳號：寫入初始資料，並直接導向 setup 頁面填寫姓名
        await setDoc(userRef, {
          email: user.email,
          uid: user.uid,
          createdAt: serverTimestamp(),
          isSetupComplete: false 
        });
        // 🚀 這裡就是註冊完自動跳轉到下一頁的關鍵！
        router.replace('/setup'); 
      } else {
        // 舊帳號登入：檢查是否填寫過姓名
        const userData = userSnap.data();
        if (userData.isSetupComplete) {
          router.replace('/home'); // 填過了，去首頁
        } else {
          router.replace('/setup'); // 沒填過，去補填
        }
      }
    } catch (error: any) {
      console.error("驗證失敗：", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        alert("帳號或密碼錯誤！");
      } else if (error.code === 'auth/email-already-in-use') {
        alert("這個信箱已經被註冊過囉！請點擊下方切換成登入模式。");
      } else if (error.code === 'auth/weak-password') {
        alert("密碼太弱了，請至少輸入 6 個字元。");
      } else {
        alert("發生錯誤：" + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!fontsLoaded) {
    return (
      <View style={{flex: 1, justifyContent:'center', alignItems:'center', backgroundColor: '#FFFDF0'}}>
        <ActivityIndicator size="large" color="#4A342E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconContainer, animatedTitleStyle]}>
        <Image
          source={require('../pikmin/red.jpg')}
          style={styles.pikminImage}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.Text style={[styles.title, animatedTitleStyle]}>
        Pikmin ADVENTURE
      </Animated.Text>
      
      <Text style={styles.subtitle}>請登入以存取冒險紀錄</Text>

      <View style={styles.card}>
        
        <TextInput 
          style={styles.input}
          placeholder="Explorer Email"
          placeholderTextColor="#A1887F"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput 
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#A1887F"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Pressable
          onPress={handleAuth}
          onPressIn={() => (buttonPressed.value = true)}
          onPressOut={() => (buttonPressed.value = false)}
          disabled={loading}
          style={{ width: '100%', marginBottom: 15 }}
        >
          <Animated.View style={[styles.actionButton, animatedButtonStyle]}>
             {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.buttonText}>
                    {isLoginMode ? "START LOG IN" : "START SIGN UP"}
                  </Text>
                </View>
              )}
          </Animated.View>
        </Pressable>

        {/* 模式切換按鈕 */}
        <Pressable onPress={() => setIsLoginMode(!isLoginMode)}>
          <Text style={styles.toggleText}>
            {isLoginMode ? "新來的探險家？點此註冊" : "已經有帳號了？點此登入"}
          </Text>
        </Pressable>

      </View>

      <Text style={styles.footerText}>Ver. 1.0.2 - Explorers Only</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF0',
    alignItems: 'center',
    justifyContent: 'center', 
    padding: 20,
  },
  iconContainer: {
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#4A342E',
    borderRadius: 12, 
    padding: 15,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  pikminImage: {
    width: 80,
    height: 80,
  },
  title: {
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 20, 
    color: '#4A342E',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 30,
    textShadowColor: '#D7CCC8',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  subtitle: {
    fontSize: 14,
    color: '#8D6E63',
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 350,
    borderWidth: 3,
    borderColor: '#4A342E',
    borderRadius: 0, 
    padding: 25, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  input: {
    width: '100%',
    backgroundColor: '#FFFDF0',
    borderWidth: 2,
    borderColor: '#4A342E',
    padding: 12,
    marginBottom: 15,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A342E',
  },
  actionButton: {
    backgroundColor: '#E84A41', 
    width: '100%',
    paddingVertical: 18,
    borderWidth: 3,
    borderColor: '#4A342E',
    borderRadius: 0, 
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 6,
    borderBottomColor: '#8C1D18', 
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontFamily: 'PressStart2P_400Regular',
    color: '#FFFFFF',
    fontSize: 12, 
  },
  toggleText: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 10,
    fontWeight: 'bold',
  },
  footerText: {
    position: 'absolute',
    bottom: 30, 
    fontSize: 10,
    color: '#D7CCC8',
    fontFamily: 'PressStart2P_400Regular',
  }
});