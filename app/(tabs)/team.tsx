import React, { useState } from 'react';
import { View, Text, TextInput, Image , ScrollView} from 'react-native';
import PixelButton from '../../components/PixelButton';
import PixelCard from '../../components/PixelCard';

export default function TeamScreen() {
  const [name, setName] = useState('皮克敏隊長');

  return (
    <View className="flex-1 bg-pikmin-bg pt-12 px-4">
      <Text className="font-pixel text-lg text-pikmin-earth mb-6">冒險隊伍</Text>
      
      <PixelCard className="items-center">
        <View className="w-24 h-24 border-4 border-pikmin-earth mb-4 bg-pikmin-yellow overflow-hidden">
          <Image source={{ uri: 'https://api.dicebear.com/7.x/pixel-art/png?seed=Pikmin' }} className="w-full h-full" />
        </View>
        <TextInput 
          className="font-pixel text-sm border-b-2 border-pikmin-earth w-full text-center mb-4"
          value={name} onChangeText={setName}
        />
        <PixelButton title="更新個人資料" onPress={()=>{}} color="bg-pikmin-leaf" />
      </PixelCard>

      <Text className="font-pixel text-xs mb-4 mt-6">夥伴成員 (3)</Text>
      <ScrollView>
        {['隊友 A', '隊友 B'].map((member, i) => (
          <PixelCard key={i} className="flex-row items-center">
             <View className="w-10 h-10 bg-gray-200 mr-4 border-2 border-pikmin-earth" />
             <Text className="font-pixel text-xs">{member}</Text>
          </PixelCard>
        ))}
        <PixelButton title="+ 新增夥伴" onPress={()=>{}} color="bg-pikmin-blue" />
      </ScrollView>
    </View>
  );
}