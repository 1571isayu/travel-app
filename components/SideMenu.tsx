import { useApp } from "@/context/AppContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
}

export default function SideMenu({ visible, onClose }: SideMenuProps) {
  const router = useRouter();
  const [userName, setUserName] = useState("冒險者");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const { theme, isDark, toggleTheme } = useApp();
  // 每次打開選單都重新讀取最新的本機資料
  useEffect(() => {
    if (visible) {
      loadUserProfile();
    }
  }, [visible]);

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

  // 🌟 修改：點擊編輯跳轉回 Setup 頁面
  const handleEditPress = () => {
    onClose(); // 先關閉選單
    router.push({
      pathname: "/setup",
      params: { mode: "edit" }, // 告訴 Setup 頁面現在是「編輯模式」
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          // 🌟 這裡使用動態顏色
          
          onPress={(e) => e.stopPropagation()}
        >
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Image
              source={require("../img/icon_X.png")}
              style={{ width: 18, height: 18 }}
            />
          </TouchableOpacity>

          {/* 使用者資訊區 */}
          <View style={styles.profileSection}>
            {userAvatar ? (
              <Image source={{ uri: userAvatar }} style={styles.avatarBox} />
            ) : (
              <View style={styles.avatarBoxPlaceholder} />
            )}

            <Text style={styles.userName} numberOfLines={1}>
              {userName}
            </Text>

            <TouchableOpacity onPress={handleEditPress} style={styles.editBtn}>
              <Image
                source={require("../img/icon_edit.png")}
                style={{ width: 18, height: 18 }}
              />
            </TouchableOpacity>
          </View>

          {/* 功能清單 */}
          <View style={styles.menuItems}>
            <View style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Image
                  source={require("../img/icon_moon.png")}
                  style={{ width: 18, height: 18 }}
                />
                <Text style={styles.itemText}>深色模式</Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
              />
            </View>

            <TouchableOpacity style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Image
                  source={require("../img/icon_help.png")}
                  style={{ width: 18, height: 18 }}
                />
                <Text style={styles.itemText}>使用教學</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Image
                  source={require("../img/icon_setting.png")}
                  style={{ width: 18, height: 18 }}
                />
                <Text style={styles.itemText}>設定</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  menuContainer: {
    width: width * 0.75,
    height: "100%",
    backgroundColor: "#FDFBF0",
    padding: 25,
    paddingTop: 60,
    borderLeftWidth: 4,
    borderLeftColor: "#5E433B",
  },
  closeBtn: { alignSelf: "flex-end", marginBottom: 20 },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },
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
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#5E433B",
    marginLeft: 15,
    flex: 1,
  },
  editBtn: { padding: 5, backgroundColor: "#EFEBE9", borderRadius: 10 },
  menuItems: { gap: 30 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  itemText: { fontSize: 18, color: "#5E433B", fontWeight: "bold" },
});
