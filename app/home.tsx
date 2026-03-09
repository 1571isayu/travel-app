import { PressStart2P_400Regular, useFonts } from '@expo-google-fonts/press-start-2p';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

const DECORATION_RED = require('../pikmin/red.jpg');
const DECORATION_BLUE = require('../pikmin/blue.jpg');
// 🌟 新增黃色皮克敏作為「選擇紀錄」的圖示
const DECORATION_YELLOW = require('../pikmin/yellow.jpg'); 

// 定義冒險紀錄的資料格式
type AdventureRecord = {
  id: string;
  name: string;
  date: string;
};

export default function HomeScreen() {
  const router = useRouter();
  
  let [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  const [adventureName, setAdventureName] = useState('');
  const [adventureDate, setAdventureDate] = useState('');
  const [joinId, setJoinId] = useState('');
  
  // 🌟 用來存放保險箱裡拿出來的冒險紀錄
  const [myAdventures, setMyAdventures] = useState<AdventureRecord[]>([]);

  // 🌟 1. 讀取小精靈：畫面一打開就去拿紀錄
  useEffect(() => {
    const loadAdventures = async () => {
      try {
        const savedData = await AsyncStorage.getItem('@my_adventures');
        if (savedData) {
          setMyAdventures(JSON.parse(savedData));
        }
      } catch (e) {
        console.error("讀取歷史紀錄失敗", e);
      }
    };
    loadAdventures();
  }, []);

  // 🌟 2. 創立新冒險並存入紀錄
  const handleCreate = async () => {
    if (!adventureName || !adventureDate) {
      Alert.alert('提示', '請輸入名稱和日期喔！');
      return;
    }

    // 產生 6 位數 ID
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newAdventure = { id: randomId, name: adventureName, date: adventureDate };

    // 把新冒險加到清單最前面，並存進保險箱
    const updatedList = [newAdventure, ...myAdventures];
    setMyAdventures(updatedList);
    await AsyncStorage.setItem('@my_adventures', JSON.stringify(updatedList));

    router.replace({
      pathname: '/(tabs)/adventure',
      params: newAdventure
    });
  };

  const handleJoin = () => {
    if (!joinId) return;
    
    // (未來這裡可以加上從 Firebase 抓取真實冒險名稱的邏輯)
    router.replace({
      pathname: '/(tabs)/adventure',
      params: { id: joinId, name: `連線隊伍 (${joinId})`, date: '未知日期' }
    });
  };

  // 🌟 3. 點擊歷史紀錄直接進入
  const handleSelectAdventure = (adv: AdventureRecord) => {
    router.replace({
      pathname: '/(tabs)/adventure',
      params: { id: adv.id, name: adv.name, date: adv.date }
    });
  };

  // 🌟 4. 長按刪除歷史紀錄
  const handleDeleteAdventure = (idToDelete: string, name: string) => {
    Alert.alert('🗑️ 刪除紀錄', `確定要從清單移除「${name}」嗎？`, [
      { text: '取消', style: 'cancel' },
      { text: '確定刪除', style: 'destructive', onPress: async () => {
          const updatedList = myAdventures.filter(adv => adv.id !== idToDelete);
          setMyAdventures(updatedList);
          await AsyncStorage.setItem('@my_adventures', JSON.stringify(updatedList));
      }}
    ]);
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
          <Text style={styles.headerSubtitle}>—— 選擇你的行動 ——</Text>
        </View>

        {/* 🌟 加上 ScrollView 讓卡片變多時可以滑動 */}
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* 🟡 SELECT CARD (選擇冒險紀錄) */}
          <View style={[styles.card, styles.cardYellow]}>
            <View style={styles.cardHeader}>
              <View style={styles.titleGroup}>
                 <Image source={DECORATION_YELLOW} style={styles.headerIcon} resizeMode="contain" />
                 <Text style={styles.pixelCardTitle}>SELECT</Text>
              </View>
            </View>
            
            {myAdventures.length === 0 ? (
              <Text style={styles.emptyText}>尚無冒險紀錄，請建立一個新旅程！</Text>
            ) : (
              myAdventures.map((adv) => (
                <TouchableOpacity 
                  key={adv.id} 
                  style={styles.historyItem}
                  onPress={() => handleSelectAdventure(adv)}
                  onLongPress={() => handleDeleteAdventure(adv.id, adv.name)}
                >
                  <View>
                    <Text style={styles.historyName}>{adv.name}</Text>
                    <Text style={styles.historyDate}>{adv.date} | ID: {adv.id}</Text>
                  </View>
                  <Text style={styles.historyGo}>GO ➔</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* 🔴 CREATE CARD (創建新冒險) */}
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
              placeholder="日期 (例: 2026/04/01)" 
              placeholderTextColor="#A1887F"
              value={adventureDate}
              onChangeText={setAdventureDate}
            />
            <TouchableOpacity style={[styles.pixelButton, styles.btnRed]} onPress={handleCreate}>
              <Text style={styles.btnText}>開始旅程</Text>
            </TouchableOpacity>
          </View>

          {/* 🔵 JOIN CARD (加入連線) */}
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

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF0',
  },
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFDF0'
  },
  inner: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 60, // 稍微往下推一點，避免被手機頂部瀏海擋住
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
  scrollContainer: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    gap: 15,
    paddingBottom: 40, // 底部留白，比較好滑動
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
  cardYellow: { borderTopWidth: 8, borderTopColor: '#F4D03F' }, // 🌟 新增黃色卡片的頂部邊框
  
  pixelInput: {
    backgroundColor: '#FDFBF0',
    borderWidth: 2,
    borderColor: '#4A342E',
    padding: 10,
    fontSize: 14,
    color: '#3E2723',
    fontWeight: 'bold',
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

  // 🌟 歷史紀錄列表的專屬樣式
  emptyText: {
    fontSize: 12,
    color: '#8D6E63',
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9EBEA',
    borderWidth: 2,
    borderColor: '#4A342E',
    padding: 12,
    marginBottom: 8,
    borderBottomWidth: 4,
  },
  historyName: {
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 10,
    color: '#4A342E',
    marginBottom: 6,
    lineHeight: 16,
  },
  historyDate: {
    fontSize: 10,
    color: '#8D6E63',
    fontWeight: 'bold',
  },
  historyGo: {
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 10,
    color: '#E84A41',
  }
});