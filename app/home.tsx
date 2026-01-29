import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';
import PixelButton from '../components/PixelButton';
import PixelCard from '../components/PixelCard';
import { Trash2 } from 'lucide-react-native';

interface Adventure {
  id: string;
  name: string;
  date: string;
}

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
    <View className="flex-1 bg-pikmin-bg p-4 pt-12">
      <Text className="font-pixel text-xl text-pikmin-earth mb-6">我的冒險</Text>

      {/* 輸入區 */}
      <PixelCard>
        <Text className="font-pixel text-xs mb-2">建立新冒險</Text>
        <TextInput 
          className="border-2 border-pikmin-earth p-2 font-pixel text-xs mb-2 bg-white" 
          placeholder="名稱 (e.g. 東京五日遊)" 
          value={name} onChangeText={setName}
        />
        <TextInput 
          className="border-2 border-pikmin-earth p-2 font-pixel text-xs mb-4 bg-white" 
          placeholder="日期 (e.g. 2023-10-10)" 
          value={date} onChangeText={setDate}
        />
        <View className="flex-row gap-2">
          <View className="flex-1"><PixelButton title="開始冒險" onPress={handleCreate} /></View>
          <View className="flex-1"><PixelButton title="加入隊伍" color="bg-pikmin-blue" onPress={()=>{}} /></View>
        </View>
      </PixelCard>

      {/* 列表區 */}
      <ScrollView>
        {adventures.map((adv: any) => (
          <TouchableOpacity key={adv.id} onPress={() => enterAdventure(adv.id)}>
            <PixelCard className="flex-row justify-between items-center bg-pikmin-yellow">
              <View>
                <Text className="font-pixel text-xs mb-2">{adv.date}</Text>
                <Text className="font-pixel text-sm">{adv.name}</Text>
              </View>
              <Trash2 color="#5D4037" size={20} />
            </PixelCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}