import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Image, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TeamScreen() {
  // 接收從 Home 傳過來的參數
  const { id, name } = useLocalSearchParams();
  const [userName, setUserName] = useState("冒險者");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const onShare = async () => {
    try {
      await Share.share({
        message: `快來加入我的冒險【${name}】！隊伍 ID 是：${id}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const storedProfile = await AsyncStorage.getItem("@user_profile");
      if (storedProfile) {
        const { name, avatar } = JSON.parse(storedProfile);
        if (name) setUserName(name);
        if (avatar) setUserAvatar(avatar);
      }
    } catch (error) {
      console.error("讀取使用者資料失敗:", error);
    }
  };
  loadUserProfile();
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
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.avatarBox} />
          ) : (
            <View style={styles.avatarBoxPlaceholder} />
          )}
          <Text style={styles.memberName} numberOfLines={1}>
            {userName}(隊長)
          </Text>
        </View>
        {/* 這裡之後會列出從 Firebase 抓到的其他成員 */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0', padding: 20, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontFamily: 'PressStart2P_400Regular', color: '#5E433B' },
  idCard: {
    backgroundColor: '#FFFDF9',
    borderWidth: 3,
    borderColor: '#5E433B',
    padding: 20,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  label: { fontSize: 16, fontWeight: 'bold', color: '#5E433B', marginBottom: 15 },
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
    backgroundColor: '#5E433B',
    padding: 12,
    marginTop: 15,
    alignItems: 'center',
  },
  shareText: { color: '#FFF', fontWeight: 'bold' },
  memberList: { flex: 1 },
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#5E433B', marginBottom: 15 },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#D7CCC8',
  },
  avatarPlaceholder: { width: 40, height: 40, backgroundColor: '#D7CCC8', marginRight: 15 },
  memberName: { fontSize: 16, color: '#5E433B' },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 3,
    borderWidth: 3,
    borderColor: "#5E433B",
  },
  avatarBoxPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#D7CCC8",
    borderWidth: 3,
    borderColor: "#5E433B",
  },
});