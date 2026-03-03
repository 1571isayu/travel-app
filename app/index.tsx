import { useRouter } from 'expo-router';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';
// 引入動畫庫
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence, 
  withTiming, 
  Easing,
  withSpring
} from 'react-native-reanimated';

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  // 載入字體
  let [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  // --- 動畫設定 ---
  // 1. 標題浮動動畫
  const titleTranslateY = useSharedValue(0);
  
  useEffect(() => {
    // 讓標題無限上下浮動
    titleTranslateY.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.quad) })
      ),
      -1, // 無限循環
      true // reverse
    );
  }, []);

  const animatedTitleStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: titleTranslateY.value }],
  }));

  // 2. 按鈕按壓動畫狀態
  const buttonPressed = useSharedValue(false);

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: buttonPressed.value ? 6 : 0 }], // 按下時下沉 6px
      borderBottomWidth: buttonPressed.value ? 0 : 6,           // 按下時邊框變薄
      marginBottom: buttonPressed.value ? 6 : 0,                // 補償位移
    };
  });
  // ----------------

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          uid: user.uid,
          createdAt: serverTimestamp(),
          isSetupComplete: false 
        });
        router.replace('/setup'); 
      } else {
        const userData = userSnap.data();
        if (userData.isSetupComplete) {
          router.replace('/home');
        } else {
          router.replace('/setup');
        }
      }
    } catch (error: any) {
      console.error("登入失敗：", error);
      alert("登入出錯囉：" + error.message);
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
      {/* 1. 頂部頭像框：帶有浮動效果的容器 */}
      <Animated.View style={[styles.iconContainer, animatedTitleStyle]}>
        <Image
          source={require('../pikmin/red.jpg')}
          style={styles.pikminImage}
          resizeMode="contain"
        />
      </Animated.View>

      {/* 2. 標題：強化顏色對比，也跟著浮動 */}
      <Animated.Text style={[styles.title, animatedTitleStyle]}>
        Pikmin ADVENTURE
      </Animated.Text>
      
      <Text style={styles.subtitle}>請登入以存取冒險紀錄</Text>

      {/* 3. 登入卡片 */}
      <View style={styles.card}>
        
        {/* 按鈕改用 Pressable + Animated 實作物理回饋 */}
        <Pressable
          onPress={handleGoogleLogin}
          onPressIn={() => (buttonPressed.value = true)}
          onPressOut={() => (buttonPressed.value = false)}
          disabled={loading}
          style={{ width: '100%', marginBottom: 20 }}
        >
          <Animated.View style={[styles.googleButton, animatedButtonStyle]}>
             {loading ? (
                <ActivityIndicator color="#4A342E" />
              ) : (
                <View style={styles.btnContent}>
                  {/* Google G Logo 簡單模擬 */}
                  <Text style={styles.gText}>G</Text> 
                  <Text style={styles.buttonText}>Google Email</Text>
                </View>
              )}
          </Animated.View>
        </Pressable>

        <Text style={styles.hint}>
          點擊上方按鈕即可快速開始您的旅程
        </Text>
      </View>

      {/* 頁尾小裝飾 */}
      <Text style={styles.footerText}>Ver. 1.0.2 - Explorers Only</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF0', // 統一米色背景
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  iconContainer: {
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#4A342E', // 咖啡色邊框
    borderRadius: 12, 
    padding: 15,
    marginBottom: 25,
    // 硬陰影
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
    fontSize: 20, // 稍微調小一點避免手機換行
    color: '#4A342E',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 30,
    // 標題陰影
    textShadowColor: '#D7CCC8',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  subtitle: {
    fontSize: 14,
    color: '#8D6E63', // 淺咖啡色
    marginBottom: 40,
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
    borderRadius: 0, // 硬派直角
    padding: 35,
    alignItems: 'center',
    // 卡片硬陰影
    shadowColor: '#000',
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
  },
  // Google 按鈕樣式 (內部 View)
  googleButton: {
    backgroundColor: '#fff',
    width: '100%',
    paddingVertical: 18,
    borderWidth: 3,
    borderColor: '#4A342E',
    borderRadius: 0, 
    alignItems: 'center',
    justifyContent: 'center',
    // 預設底邊厚度 (會被動畫改變)
    borderBottomWidth: 6,
    borderBottomColor: '#4A342E', 
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  gText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#4285F4',
    fontFamily: 'serif', 
  },
  buttonText: {
    fontFamily: 'PressStart2P_400Regular',
    color: '#4A342E',
    fontSize: 12, 
  },
  hint: {
    fontSize: 12,
    color: '#A1887F',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 10,
  },
  footerText: {
    position: 'absolute',
    bottom: 30,
    fontSize: 10,
    color: '#D7CCC8',
    fontFamily: 'PressStart2P_400Regular',
  }
});