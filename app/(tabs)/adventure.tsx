import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useApp } from '../../context/AppContext';
import PixelCard from '../../components/PixelCard';
import PixelButton from '../../components/PixelButton';

export default function AdventurePage() {
  const { getCurrentAdventure } = useApp();
  const adventure = getCurrentAdventure();
  const [selectedDay, setSelectedDay] = useState(1);

  // 假資料模擬
  const plans = [
    { day: 1, time: '10:00', title: '成田機場', type: 'Trans', note: '搭乘 SkyLiner' },
    { day: 1, time: '12:00', title: '淺草寺', type: 'Spot', note: '雷門集合', important: true },
  ];

  return (
    <View className="flex-1 bg-pikmin-bg pt-10">
      {/* 標頭 */}
      <View className="px-4 mb-4 flex-row justify-between items-end border-b-4 border-pikmin-earth pb-2">
        <View>
          <Text className="font-pixel text-lg text-pikmin-red">{adventure?.name}</Text>
          <Text className="font-pixel text-xs mt-1 text-gray-500">{adventure?.date}</Text>
        </View>
        <Text className="font-pixel text-xs">隊伍: 4人</Text>
      </View>

      {/* 天數選擇器 */}
      <View className="h-12 mb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-4">
          {[1,2,3,4,5].map(d => (
            <TouchableOpacity key={d} onPress={() => setSelectedDay(d)} className={`mr-2 px-4 py-2 border-2 border-pikmin-earth ${selectedDay === d ? 'bg-pikmin-red' : 'bg-white'}`}>
              <Text className={`font-pixel text-xs ${selectedDay === d ? 'text-white' : 'text-black'}`}>Day {d}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* 行程列表 */}
      <ScrollView className="flex-1 px-4">
        {plans.map((item, idx) => (
          <View key={idx} className="flex-row mb-4">
            {/* 時間軸 */}
            <View className="w-16 pt-2 items-center">
              <Text className={`font-pixel text-xs ${item.important ? 'text-red-500' : 'text-gray-600'}`}>{item.time}</Text>
              <View className="w-1 flex-1 bg-pikmin-earth opacity-20 my-1" />
            </View>
            
            {/* 內容 */}
            <View className="flex-1">
              {item.type === 'Spot' ? (
                <PixelCard className={item.important ? 'bg-yellow-100' : 'bg-white'}>
                  <Text className="font-pixel text-sm mb-2">{item.title}</Text>
                  {item.note && <Text className="font-pixel text-[10px] text-gray-500 mb-2">{item.note}</Text>}
                  <TouchableOpacity onPress={() => Linking.openURL('https://maps.google.com')}>
                    <Text className="font-pixel text-[10px] text-blue-500 underline">開啟 Google Maps</Text>
                  </TouchableOpacity>
                </PixelCard>
              ) : (
                <View className="py-2 px-2">
                  <Text className="font-pixel text-xs text-gray-700">🚌 {item.title}</Text>
                  <Text className="font-pixel text-[10px] text-gray-400 pl-4">{item.note}</Text>
                </View>
              )}
            </View>
          </View>
        ))}
        
        <View className="mt-4">
            <PixelButton title="+ 新增計畫" onPress={() => {}} />
        </View>
      </ScrollView>
    </View>
  );
}