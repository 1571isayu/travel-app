import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFonts, PressStart2P_400Regular } from '@expo-google-fonts/press-start-2p';

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

  const handleCreate = () => { /* ... */ };
  const handleJoin = () => { /* ... */ };

  if (!fontsLoaded) {
    return (
      <View style={{flex:1, justifyContent:'center', alignItems:'center', backgroundColor: '#FFFDF0'}}>
        <ActivityIndicator size="large" color="#4A342E" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      <View style={styles.header}>
        <Text style={styles.pixelTitle}>PIKMIN LOG</Text> 
        <Text style={styles.headerSubtitle}>—— 選擇你的冒險方式 ——</Text>
      </View>

      {/* 雙欄卡片區 */}
      <View style={styles.rowContainer}>

        {/* --- 左邊：建立冒險 --- */}
        <View style={[styles.card, styles.cardRed]}>
          <View style={styles.cardHeader}>
            <View style={styles.titleGroup}>
               <Image source={DECORATION_RED} style={styles.headerIcon} resizeMode="contain" />
               <Text style={styles.pixelCardTitle}>CREATE</Text>
            </View>
            <View style={styles.pixelDotRed} />
          </View>
          
          <Text style={styles.label}>冒險名稱</Text>
          <TextInput 
            style={styles.pixelInput} 
            placeholder="e.g. 東京五日遊" 
            placeholderTextColor="#999"
            value={adventureName}
            onChangeText={setAdventureName}
          />
          <Text style={styles.label}>日期 (YYYY-MM-DD)</Text>
          <TextInput 
            style={styles.pixelInput} 
            placeholder="2023-10-10" 
            placeholderTextColor="#999"
            value={adventureDate}
            onChangeText={setAdventureDate}
          />
          <View style={{flex: 1}} />
          <TouchableOpacity style={[styles.pixelButton, styles.btnRed]} onPress={handleCreate}>
            <Text style={styles.btnText}>開始新旅程</Text>
          </TouchableOpacity>
        </View>

        {/* --- 中間分隔線已刪除 --- */}

        {/* --- 右邊：加入冒險 --- */}
        <View style={[styles.card, styles.cardBlue]}>
          <View style={styles.cardHeader}>
            <View style={styles.titleGroup}>
               <Image source={DECORATION_BLUE} style={styles.headerIcon} resizeMode="contain" />
               <Text style={styles.pixelCardTitle}>JOIN</Text>
            </View>
            <View style={styles.pixelDotBlue} />
          </View>

          <Text style={styles.label}>輸入冒險 ID</Text>
          <TextInput 
            style={styles.pixelInput} 
            placeholder="#123456" 
            placeholderTextColor="#999"
            value={joinId}
            onChangeText={setJoinId}
          />
          <Text style={styles.hintText}>
            請輸入隊長分享給您的 6 位數代碼，{"\n"}即可同步加入隊伍。
          </Text>
          <View style={{flex: 1}} />
          <TouchableOpacity style={[styles.pixelButton, styles.btnBlue]} onPress={handleJoin}>
            <Text style={styles.btnText}>加入現有隊伍</Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF0',
  },
  scrollContent: {
    padding: 40,
    flexGrow: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  pixelTitle: {
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 36,
    color: '#4A342E',
    marginBottom: 15,
    textShadowColor: '#E0D0B0',
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 0,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8B5A2B',
    fontWeight: 'bold',
    opacity: 0.8,
  },

  // --- 關鍵修改 ---
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    
    // 🔥 新增：使用 gap 來控制兩個卡片之間的距離
    gap: 40, 
  },

  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#4A342E',
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    minHeight: 400,
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#EEE',
    paddingBottom: 15,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  headerIcon: {
    width: 48,
    height: 48, 
  },
  pixelCardTitle: {
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 20,
    color: '#333',
    paddingTop: 4,
  },

  // 紅色系
  cardRed: {
    borderTopWidth: 10,
    borderTopColor: '#E84A41',
  },
  pixelDotRed: { width: 15, height: 15, backgroundColor: '#E84A41', borderWidth: 2, borderColor: '#000' },
  btnRed: { backgroundColor: '#E84A41' },

  // 藍色系
  cardBlue: {
    borderTopWidth: 10,
    borderTopColor: '#2980B9',
  },
  pixelDotBlue: { width: 15, height: 15, backgroundColor: '#2980B9', borderWidth: 2, borderColor: '#000' },
  btnBlue: { backgroundColor: '#2980B9' },

  // 表單元件
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 8,
    marginTop: 10,
  },
  hintText: {
    fontSize: 12,
    color: '#888',
    marginTop: 10,
    lineHeight: 18,
  },
  pixelInput: {
    backgroundColor: '#F9F9F9',
    borderWidth: 2,
    borderColor: '#4A342E',
    padding: 15,
    fontSize: 16,
    marginBottom: 10,
    fontFamily: 'Courier', 
  },
  pixelButton: {
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000',
    borderBottomWidth: 6,
    marginTop: 30,
  },
  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
    letterSpacing: 1,
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 14,
  },
});