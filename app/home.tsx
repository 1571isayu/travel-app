import { PressStart2P_400Regular, useFonts } from '@expo-google-fonts/press-start-2p';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { 
  ActivityIndicator, 
  Image, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';

const DECORATION_RED = require('../pikmin/red.jpg');
const DECORATION_BLUE = require('../pikmin/blue.jpg');

export default function HomeScreen() {
  const router = useRouter();
  
  let [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  const [adventureName, setAdventureName] = useState('');
  const [adventureDate, setAdventureDate] = useState('');
  const [joinId, setJoinId] = useState('');

  const handleCreate = () => {
    if (!adventureName || !adventureDate) return;

    // 產生 6 位數 ID
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();

    // --- 關鍵修復：跳轉到 (tabs) 分組 ---
    router.replace({
      pathname: '/(tabs)/adventure',
      params: { 
        id: randomId, 
        name: adventureName,
        date: adventureDate
      }
    });
  };

  const handleJoin = () => {
    if (!joinId) return;
    // 加入邏輯...
    router.replace({
      pathname: '/(tabs)/adventure',
      params: { id: joinId }
    });
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A342E" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inner}>
        
        <View style={styles.header}>
          <Text style={styles.pixelTitle}>PIKMIN LOG</Text> 
          <Text style={styles.headerSubtitle}>—— 選擇冒險方式 ——</Text>
        </View>

        <View style={styles.stackContainer}>
          {/* CREATE CARD */}
          <View style={[styles.card, styles.cardRed]}>
            <View style={styles.cardHeader}>
              <View style={styles.titleGroup}>
                 <Image source={DECORATION_RED} style={styles.headerIcon} resizeMode="contain" />
                 <Text style={styles.pixelCardTitle}>CREATE</Text>
              </View>
            </View>
            <TextInput 
              style={styles.pixelInput} 
              placeholder="冒險名稱" 
              placeholderTextColor="#A1887F"
              value={adventureName}
              onChangeText={setAdventureName}
            />
            <TextInput 
              style={[styles.pixelInput, { marginTop: 8 }]} 
              placeholder="日期 YYYY/MM/DD" 
              placeholderTextColor="#A1887F"
              value={adventureDate}
              onChangeText={setAdventureDate}
            />
            <TouchableOpacity style={[styles.pixelButton, styles.btnRed]} onPress={handleCreate}>
              <Text style={styles.btnText}>開始旅程</Text>
            </TouchableOpacity>
          </View>

          {/* JOIN CARD */}
          <View style={[styles.card, styles.cardBlue]}>
            <View style={styles.cardHeader}>
              <View style={styles.titleGroup}>
                 <Image source={DECORATION_BLUE} style={styles.headerIcon} resizeMode="contain" />
                 <Text style={styles.pixelCardTitle}>JOIN</Text>
              </View>
            </View>
            <TextInput 
              style={styles.pixelInput} 
              placeholder="輸入 6 位冒險 ID" 
              placeholderTextColor="#A1887F"
              autoCapitalize="characters"
              value={joinId}
              onChangeText={setJoinId}
            />
            <TouchableOpacity style={[styles.pixelButton, styles.btnBlue]} onPress={handleJoin}>
              <Text style={styles.btnText}>加入隊伍</Text>
            </TouchableOpacity>
          </View>
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF0', // 確保背景色填滿，不留白邊
  },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFDF0'
  },
  inner: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: 'center',
    // 確保這裡沒有任何 paddingBottom 會留給 Tab Bar 的空間
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  pixelTitle: {
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 22,
    color: '#4A342E',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8D6E63',
    fontWeight: 'bold',
    marginTop: 8,
  },
  stackContainer: {
    width: '100%',
    gap: 15,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#4A342E',
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 25,
    height: 25, 
  },
  pixelCardTitle: {
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 14,
    color: '#4A342E',
  },
  cardRed: { borderTopWidth: 8, borderTopColor: '#E84A41' },
  btnRed: { backgroundColor: '#E84A41' },
  cardBlue: { borderTopWidth: 8, borderTopColor: '#2980B9' },
  btnBlue: { backgroundColor: '#2980B9' },
  pixelInput: {
    backgroundColor: '#FDFBF0',
    borderWidth: 2,
    borderColor: '#4A342E',
    padding: 10,
    fontSize: 14,
    color: '#3E2723',
  },
  pixelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
    borderBottomWidth: 4,
    marginTop: 10,
  },
  btnText: {
    color: '#FFF',
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 10,
  },
});