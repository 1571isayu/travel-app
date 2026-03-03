import { PressStart2P_400Regular, useFonts } from '@expo-google-fonts/press-start-2p';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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
            placeholderTextColor="#A1887F"
            value={adventureName}
            onChangeText={setAdventureName}
          />
          <Text style={styles.label}>日期 (YYYY-MM-DD)</Text>
          <TextInput 
            style={styles.pixelInput} 
            placeholder="2026-03-02" 
            placeholderTextColor="#A1887F"
            value={adventureDate}
            onChangeText={setAdventureDate}
          />
          <View style={{flex: 1}} />
          <TouchableOpacity style={[styles.pixelButton, styles.btnRed]} onPress={handleCreate}>
            <Text style={styles.btnText}>開始新旅程</Text>
          </TouchableOpacity>
        </View>

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
            placeholderTextColor="#A1887F"
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
    backgroundColor: '#FFFDF0', // 米色背景一致
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
    // 強化陰影效果
    textShadowColor: '#D7CCC8',
    textShadowOffset: { width: 5, height: 5 },
    textShadowRadius: 0,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8D6E63', // 改為深褐色
    fontWeight: 'bold',
    letterSpacing: 2,
  },

  rowContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    gap: 40, 
  },

  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#4A342E',
    padding: 30,
    // 標誌性的硬陰影
    shadowColor: "#000",
    shadowOffset: { width: 10, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 0,
    minHeight: 450,
    borderRadius: 0, // 確保完全直角
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#F5F5F5', // 淡淡的分割線
    paddingBottom: 15,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  headerIcon: {
    width: 42,
    height: 42, 
  },
  pixelCardTitle: {
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 20,
    color: '#4A342E', // 統一深咖色
    paddingTop: 4,
  },

  // 紅色系
  cardRed: {
    borderTopWidth: 12,
    borderTopColor: '#E84A41',
  },
  pixelDotRed: { width: 16, height: 16, backgroundColor: '#E84A41', borderWidth: 3, borderColor: '#4A342E' },
  btnRed: { backgroundColor: '#E84A41' },

  // 藍色系
  cardBlue: {
    borderTopWidth: 12,
    borderTopColor: '#2980B9',
  },
  pixelDotBlue: { width: 16, height: 16, backgroundColor: '#2980B9', borderWidth: 3, borderColor: '#4A342E' },
  btnBlue: { backgroundColor: '#2980B9' },

  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A342E', // 統一深咖
    marginBottom: 10,
    marginTop: 15,
  },
  hintText: {
    fontSize: 13,
    color: '#A1887F', // 褐色系提示字
    marginTop: 15,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  pixelInput: {
    backgroundColor: '#FDFBF0', // 輸入框也帶一點米色感
    borderWidth: 3,
    borderColor: '#4A342E',
    padding: 15,
    fontSize: 16,
    marginBottom: 12,
    fontFamily: 'Courier', 
    color: '#3E2723',
  },
  pixelButton: {
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000',
    borderBottomWidth: 8, // 增加按鈕厚度
    marginTop: 30,
    borderRadius: 0, // 確保按鈕是直角
  },
  btnText: {
    color: '#FFF',
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 12, // 像素字體稍微縮小一點點比較精緻
  },
});