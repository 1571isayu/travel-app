import { useRouter } from 'expo-router';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function WelcomeScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

// 在 app/index.tsx 裡面找到 handleGoogleLogin

const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // 1. 取得使用者的資料庫紀錄
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // A. 如果是完全的新人 -> 先建立基礎資料，然後踢去 Setup 頁面
        await setDoc(userRef, {
          email: user.email,
          uid: user.uid,
          createdAt: serverTimestamp(),
          isSetupComplete: false // 標記：還沒設定完
        });
        console.log("新用戶，前往創角...");
        router.replace('/setup'); // <--- 關鍵！去創角頁
      } else {
        // B. 如果是舊人 -> 檢查有沒有設定過 (isSetupComplete)
        const userData = userSnap.data();
        if (userData.isSetupComplete) {
            console.log("老玩家，直接進遊戲");
            router.replace('/home');
        } else {
            console.log("資料不完整，補創角");
            router.replace('/setup');
        }
      }

    } catch (error: any) {
      // ... 錯誤處理保持原樣
    } finally {
      setLoading(false);
    }
};

  return (
    <View style={styles.container}>
      {/* 頂部皮克敏圖示 */}
      <View style={styles.iconContainer}>
        <Image 
          source={{ uri: require('../pikmin/red.jpg') }} 
          style={styles.pikminImage} 
          resizeMode="contain"
        />
      </View>

      <Text style={styles.title}> Pikmin ADVENTURE</Text>
      <Text style={styles.subtitle}>請登入以存取冒險紀錄</Text>

      {/* 只有一個大按鈕的卡片區 */}
      <View style={styles.card}>
        <TouchableOpacity 
          style={styles.googleButton} 
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#4A342E" />
          ) : (
            <View style={styles.btnContent}>
               {/* 模擬 Google G Logo */}
               <View style={styles.gIcon}>
                 <Text style={styles.gText}>G</Text>
               </View>
               <Text style={styles.buttonText}>Google Email</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          點擊上方按鈕即可快速開始您的旅程
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  iconContainer: {
    backgroundColor: 'white',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 15,
    padding: 10,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.1,
  },
  pikminImage: {
    width: 80,
    height: 80,
  },
  title: {
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 22,
    color: '#4A342E',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'sans-serif',
    fontSize: 14,
    color: '#888',
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    width: '100%',
    maxWidth: 350,
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  // Google 按鈕樣式
  googleButton: {
    backgroundColor: '#fff', // Google 官方通常是白底或藍底
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
    marginBottom: 15,
    // 讓按鈕有點立體感
    borderBottomWidth: 5,
    borderRightWidth: 1, 
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gIcon: {
    marginRight: 10,
  },
  gText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285F4', // Google 藍
    fontFamily: 'sans-serif',
  },
  buttonText: {
    fontFamily: 'PressStart2P_400Regular',
    color: '#000',
    fontSize: 12,
  },
  hint: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
  }
});