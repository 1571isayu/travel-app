import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

// 這裡準備了像素風 Pikmin 頭像
const AVATARS = [
  { id: 'red', uri: require('../pikmin/red.jpg') },
  { id: 'blue', uri: require('../pikmin/blue.jpg') },
  { id: 'yellow', uri: require('../pikmin/yellow.jpg') },
  { id: 'dark-blue', uri: require('../pikmin/dark-blue.jpg') },
  { id: 'pink', uri: require('../pikmin/pink.jpg') },
  { id: 'purple', uri: require('../pikmin/purple.jpg') },
  { id: 'stone', uri: require('../pikmin/stone.jpg') },
  { id: 'white', uri: require('../pikmin/white.jpg') },
];

export default function SetupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].uri); // 預設選第一個
  const [loading, setLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!name.trim()) return alert("請輸入你的冒險者名稱！");
    
    const user = auth.currentUser;
    if (!user) return router.replace('/'); 

    setLoading(true);
    try {
      // 注意：Firebase 不建議直接存本地的 require ID，
      // 但如果你只是為了前端顯示，暫時這樣存是 OK 的
      await updateDoc(doc(db, "users", user.uid), {
        displayName: name,
        photoURL: selectedAvatar, 
        isSetupComplete: true 
      });

      console.log("創角成功！");
      router.replace('/home'); 
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
        
        {/* 預覽目前選中的大頭像 */}
        <View style={[styles.avatarOption, styles.avatarSelected, { marginBottom: 20 }]}>
            <Image source={selectedAvatar} style={styles.avatarImg} />
        </View>

        {/* 1. 頭像選擇區 */}
        <Text style={styles.label}>CHOOSE AVATAR</Text>
        <View style={styles.avatarGrid}>
          {AVATARS.map((avatar) => (
            <TouchableOpacity 
              key={avatar.id} 
              onPress={() => setSelectedAvatar(avatar.uri)}
              style={[
                styles.avatarOption, 
                selectedAvatar === avatar.uri && styles.avatarSelected 
              ]}
            >
              {/* 正確修正：本地資源直接傳給 source */}
              <Image source={avatar.uri} style={styles.avatarImg} />
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
    backgroundColor: '#2C3E50',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    color: '#F1C40F',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold', // 如果沒有字體，先用粗體代替
  },
  subtitle: {
    color: '#BDC3C7',
    marginBottom: 30,
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFF',
    width: '100%',
    maxWidth: 360,
    borderWidth: 4,
    borderColor: '#000',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1, 
    elevation: 5, 
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    color: '#2C3E50',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  avatarOption: {
    width: 64,
    height: 64,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#95A5A6',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    overflow: 'hidden', // 確保圖片不會超出框框
  },
  avatarSelected: {
    borderColor: '#E84A41',
    borderWidth: 4,
    backgroundColor: '#FFF',
    transform: [{ scale: 1.1 }], 
  },
  avatarImg: {
    width: '90%',
    height: '90%',
    resizeMode: 'contain',
  },
  input: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: '#FFF',
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
  },
  button: {
    backgroundColor: '#27AE60',
    width: '100%',
    padding: 15,
    borderWidth: 2,
    borderColor: '#000',
    borderBottomWidth: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  }
});