import React, { useState } from 'react';
// 這裡也要補上 TextInput
import { View, Text, TextInput, ScrollView } from 'react-native';
import PixelButton from '../../components/PixelButton';
import PixelCard from '../../components/PixelCard';

export default function WalletPage() {
  const [twd, setTwd] = useState('');
  const rate = 0.21; // 匯率

  return (
    <View className="flex-1 bg-pikmin-bg pt-10 px-4">
      <Text className="font-pixel text-lg text-pikmin-earth mb-4">冒險錢包</Text>

      {/* 匯率計算機 */}
      <View className="bg-pikmin-dark border-4 border-pikmin-earth p-4 rounded-lg mb-6">
        <Text className="text-green-400 font-pixel text-right text-[10px] mb-2">匯率: {rate}</Text>
        <View className="flex-row items-end justify-between">
           <View>
             <Text className="text-white font-pixel text-[10px] mb-1">台幣 TWD</Text>
             <TextInput 
                className="text-white font-pixel text-xl border-b border-white w-24" 
                keyboardType="numeric"
                value={twd} onChangeText={setTwd} placeholder="0" placeholderTextColor="#555"
             />
           </View>
           <Text className="text-white font-pixel text-xl mb-2">=</Text>
           <View>
             <Text className="text-white font-pixel text-[10px] mb-1">日幣 JPY</Text>
             <Text className="text-pikmin-yellow font-pixel text-xl">
               {(parseFloat(twd || '0') / rate).toFixed(0)}
             </Text>
           </View>
        </View>
      </View>

      {/* 記帳區 */}
      <PixelCard>
        <Text className="font-pixel text-xs mb-2">快速記帳</Text>
        <View className="flex-row gap-2 mb-2">
           <TextInput className="flex-1 border-2 border-pikmin-earth p-2 font-pixel text-xs" placeholder="品項" />
           <TextInput className="w-20 border-2 border-pikmin-earth p-2 font-pixel text-xs" placeholder="$" keyboardType="numeric" />
        </View>
        <PixelButton title="確認記帳" color="bg-pikmin-yellow" onPress={()=>{}} />
      </PixelCard>

      <Text className="font-pixel text-xs text-center mt-4">今日總花費: $0</Text>
    </View>
  );
}