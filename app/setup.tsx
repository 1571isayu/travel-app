import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

// 這裡準備了 4 個像素風頭像供選擇
const AVATARS = [
  { id: 'plant', uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-i/red-blue/transparent/43.png' }, // 走路草
  { id: 'flower', uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-i/red-blue/transparent/44.png' }, // 臭臭花
  { id: 'mushroom', uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-i/red-blue/transparent/46.png' }, // 派拉斯
  { id: 'dig', uri: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-i/red-blue/transparent/50.png' }, // 地鼠
];

export default function SetupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].uri); // 預設選第一個
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!name.trim()) return alert("請輸入你的冒險者名稱！");
    
    const user = auth.currentUser;
    if (!user) return router.replace('/'); // 如果沒登入，踢回首頁

    setLoading(true);
    try {
      // 更新 Firebase 資料庫
      await updateDoc(doc(db, "users", user.uid), {
        displayName: name,
        photoURL: selectedAvatar,
        isSetupComplete: true // 標記：已經創角完成
      });

      console.log("創角成功！");
      router.replace('/home'); // 進入遊戲
    } catch (error) {
      console.error(error);
      alert("存檔失敗，請檢查網路");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CHARACTER SELECT</Text>
      <Text style={styles.subtitle}>選擇你的樣貌與名稱</Text>

      <View style={styles.card}>
        
        {/* 1. 頭像選擇區 */}
        <Text style={styles.label}>CHOOSE AVATAR</Text>
        <View style={styles.avatarGrid}>
          {AVATARS.map((avatar) => (
            <TouchableOpacity 
              key={avatar.id} 
              onPress={() => setSelectedAvatar(avatar.uri)}
              style={[
                styles.avatarOption, 
                selectedAvatar === avatar.uri && styles.avatarSelected // 如果被選中，套用特殊樣式
              ]}
            >
              <Image source={{ uri: avatar.uri }} style={styles.avatarImg} />
            </TouchableOpacity>
          ))}
        </View>

        {/* 2. 名字輸入區 */}
        <Text style={styles.label}>ENTER NAME</Text>
        <TextInput 
          style={styles.input}
          placeholder="e.g. 歐利瑪隊長"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#999"
          maxLength={10}
        />

        {/* 3. 確認按鈕 */}
        <TouchableOpacity style={styles.button} onPress={handleSaveProfile} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? "SAVING..." : "CONFIRM & START"}
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2C3E50', // 深色背景，更有創角畫面的感覺
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 20,
    color: '#F1C40F', // 金黃色標題
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'black',
    textShadowOffset: {width: 2, height: 2},
    textShadowRadius: 0,
  },
  subtitle: {
    fontFamily: 'sans-serif',
    color: '#BDC3C7',
    marginBottom: 30,
    fontSize: 12,
  },
  card: {
    backgroundColor: '#ECF0F1',
    width: '100%',
    maxWidth: 360,
    borderWidth: 4,
    borderColor: '#000',
    padding: 20,
    alignItems: 'center',
    // 復古卡片陰影
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1, 
    elevation: 0, 
  },
  label: {
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 12,
    marginTop: 10,
    marginBottom: 10,
    color: '#2C3E50',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    marginBottom: 20,
  },
  avatarOption: {
    width: 70,
    height: 70,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#95A5A6',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  avatarSelected: {
    borderColor: '#E84A41', // 選中時變紅色框
    borderWidth: 4,
    backgroundColor: '#FFE082', // 選中時背景變亮黃
    transform: [{ scale: 1.1 }], // 稍微放大
  },
  avatarImg: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  input: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFF',
    padding: 15,
    fontSize: 16,
    fontFamily: 'sans-serif', // 輸入中文用一般字體比較好讀
    textAlign: 'center',
    marginBottom: 25,
  },
  button: {
    backgroundColor: '#27AE60', // 綠色開始按鈕
    width: '100%',
    padding: 15,
    borderWidth: 2,
    borderColor: '#000',
    borderBottomWidth: 6, // 立體感
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'PressStart2P_400Regular',
    color: 'white',
    fontSize: 14,
  }
});