import { useRouter } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { useApp } from '../context/AppContext';

export default function HomeScreen() {
  const router = useRouter();
  const { adventures, addAdventure, setCurrentAdvId } = useApp();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  const handleCreate = () => {
    if(!name || !date) return;
    addAdventure(name, date);
    setName(''); setDate('');
  };

  const enterAdventure = (id: string) => {
    setCurrentAdvId(id);
    router.push('/(tabs)/adventure' as any);
  };

  return (
    // 這裡使用 styles.container
    <View style={styles.container}>
      <Text style={styles.headerTitle}>我的冒險</Text>

      {/* 輸入區 */}
      <PixelCard>
        <Text style={styles.label}>建立新冒險</Text>
        <TextInput 
          style={styles.input}
          placeholder="名稱 (e.g. 東京五日遊)" 
          value={name} onChangeText={setName}
          placeholderTextColor="#999"
        />
        <TextInput 
          style={styles.input}
          placeholder="日期 (e.g. 2023-10-10)" 
          value={date} onChangeText={setDate}
          placeholderTextColor="#999"
        />
        <View style={styles.buttonRow}>
          <View style={{ flex: 1 }}><PixelButton title="開始冒險" onPress={handleCreate} /></View>
          <View style={{ flex: 1 }}><PixelButton title="加入隊伍" color="#3A8FCA" onPress={()=>{}} /></View>
        </View>
      </PixelCard>

      {/* 列表區 */}
      <ScrollView style={{ marginTop: 20 }}>
        {adventures.map((adv: any) => (
          <TouchableOpacity key={adv.id} onPress={() => enterAdventure(adv.id)}>
            {/* 這裡手動給予背景色 */}
            <View style={[styles.adventureCard, { backgroundColor: '#F5D33F' }]}>
              <View>
                <Text style={styles.adventureDate}>{adv.date}</Text>
                <Text style={styles.adventureName}>{adv.name}</Text>
              </View>
              <Trash2 color="#5D4037" size={20} />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// 在這裡定義所有顏色和排版
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEF9E7', // 皮克敏米黃色背景
    padding: 16,
    paddingTop: 48,
  },
  headerTitle: {
    fontFamily: 'PressStart2P_400Regular', // 使用剛才安裝的像素字體
    fontSize: 20,
    color: '#6D4C41', // 土地棕
    marginBottom: 24,
  },
  label: {
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 10,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 2,
    borderColor: '#6D4C41',
    padding: 10,
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 12,
    marginBottom: 12,
    backgroundColor: 'white',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  adventureCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6D4C41',
    marginBottom: 12,
  },
  adventureDate: {
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 8,
    marginBottom: 4,
  },
  adventureName: {
    fontFamily: 'PressStart2P_400Regular',
    fontSize: 12,
  },
});