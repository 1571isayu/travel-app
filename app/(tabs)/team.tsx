import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Share } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function TeamScreen() {
  // 接收從 Home 傳過來的參數
  const { id, name } = useLocalSearchParams();

  const onShare = async () => {
    try {
      await Share.share({
        message: `快來加入我的冒險【${name}】！隊伍 ID 是：${id}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MY TEAM</Text>
      </View>

      <View style={styles.idCard}>
        <Text style={styles.label}>目前冒險：{name || '未設定'}</Text>
        <View style={styles.idBox}>
          <Text style={styles.idLabel}>隊伍分享代碼</Text>
          <Text style={styles.idText}>{id || '------'}</Text>
        </View>
        
        <TouchableOpacity style={styles.shareButton} onPress={onShare}>
          <Text style={styles.shareText}>分享 ID 給隊友</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.memberList}>
        <Text style={styles.listTitle}>隊伍成員 (1/5)</Text>
        <View style={styles.memberItem}>
          <View style={styles.avatarPlaceholder} />
          <Text style={styles.memberName}>你 (隊長)</Text>
        </View>
        {/* 這裡之後會列出從 Firebase 抓到的其他成員 */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0', padding: 20, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontFamily: 'PressStart2P_400Regular', color: '#4A342E' },
  idCard: {
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#4A342E',
    padding: 20,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  label: { fontSize: 16, fontWeight: 'bold', color: '#4A342E', marginBottom: 15 },
  idBox: {
    backgroundColor: '#FDFBF0',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#8D6E63',
    padding: 15,
    alignItems: 'center',
  },
  idLabel: { fontSize: 12, color: '#8D6E63', marginBottom: 5 },
  idText: { fontSize: 24, fontWeight: 'bold', color: '#E84A41', letterSpacing: 5 },
  shareButton: {
    backgroundColor: '#4A342E',
    padding: 12,
    marginTop: 15,
    alignItems: 'center',
  },
  shareText: { color: '#FFF', fontWeight: 'bold' },
  memberList: { flex: 1 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#4A342E', marginBottom: 15 },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#D7CCC8',
  },
  avatarPlaceholder: { width: 40, height: 40, backgroundColor: '#D7CCC8', marginRight: 15 },
  memberName: { fontSize: 16, color: '#4A342E' },
});