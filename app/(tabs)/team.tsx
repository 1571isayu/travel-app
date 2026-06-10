import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect, useGlobalSearchParams } from "expo-router";
import {
  arrayRemove,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet, Switch, Text,
  TouchableOpacity,
  View
} from "react-native"; // 記得匯入 Switch 元件
import { useTheme } from "../../context/ThemeContext"; // 確保路徑正確
import { db } from "../../firebaseConfig";

import { COLORS } from "@/constants/theme";
// ─────────────────────────────────────────────
// 角色圖對照表（直接用 characterId 對應圖片）
// ─────────────────────────────────────────────
const CHARACTER_MAP: Record<string, any> = {
  bear: require("../../character/character_bear.gif"),
  cat: require("../../character/character_cat.gif"),
};

function getCharacterSource(characterId: string | null | undefined) {
  if (!characterId) return null;
  // 確保拿到的字串能去除可能多餘的引號或空格，並對應到對照表
  const key = String(characterId).trim();
  return CHARACTER_MAP[key] ?? null;
}

// ─────────────────────────────────────────────
// 使用教學資料
// ─────────────────────────────────────────────
const TUTORIAL_STEPS = [
  {
    icon: "🗺️",
    title: "建立冒險",
    desc: "在首頁點擊「CREATE」輸入冒險名稱與日期，系統會自動產生一組隊伍 ID。",
  },
  {
    icon: "🤝",
    title: "邀請隊友",
    desc: "把隊伍 ID 分享給朋友，朋友在首頁點擊「JOIN」輸入 ID 即可加入，最多 5 人。",
  },
  {
    icon: "🤝",
    title: "新增行程",
    desc: "進入冒險後點右下角「＋」按鈕，填寫時間、地點、備註，立即同步給所有隊友。",
  },
  {
    icon: "🗺️",
    title: "查看地圖",
    desc: "行程頁右上角的地圖圖示，可依天數查看當天所有地點的路線規劃。",
  },
  {
    icon: "💰",
    title: "旅費分帳",
    desc: "切換到錢包頁面，新增每筆消費並選擇分擔人，系統自動計算每人應付金額。",
  },
  {
    icon: "🎒",
    title: "旅遊清單",
    desc: "背包頁可以建立行前準備清單，勾選已完成的項目，不怕出門忘東忘西！",
  },
];

// ─────────────────────────────────────────────
// 主元件
// ─────────────────────────────────────────────
export default function TeamScreen() {
  // 取得全域深色模式狀態與切換函式
  const { isDarkMode, toggleTheme } = useTheme();

  // 🌟 動態顏色設定：依照 isDarkMode 決定要回傳什麼顏色
  const themeColors = {
    line: isDarkMode ? "#F2EDE4" : "#5E433B",
    line2: isDarkMode ? "#C8B8A2" : "#8D6E63",
    primary: isDarkMode ? "#EC7424" : "#EC7424",
    primary_pressed: isDarkMode ? "#D6631D" : "#D6631D",
    secondary: isDarkMode ? "#F6E3BD" : "#F6E3BD",
    disable: isDarkMode ? "#C5D8BA" : "#C5D8BA",
    bg: isDarkMode ? "#2C2C2C" : "#F4F0E8",
    bg2: isDarkMode ? "#3D3D3D" : "#FFFDF9",
  };

  const { id, name } = useGlobalSearchParams();

  // 本機個人資料（永遠以這份為準顯示自己頭像）
  const [myName, setMyName] = useState("冒險者");
  const [myAvatar, setMyAvatar] = useState<string | null>(null);
  const [myUid, setMyUid] = useState<string | null>(null);

  // Firebase 隊伍成員
  const [members, setMembers] = useState<any[]>([]);

  // UI 狀態
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [leaveConfirmVisible, setLeaveConfirmVisible] = useState(false);

  // ── 載入個人資料（每次頁面 focus 都重新讀，讓 setup 編輯後立即反映）──
  const loadProfile = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("@user_profile");
      if (stored) {
        const profile = JSON.parse(stored);
        if (profile.name) setMyName(profile.name);
        // 🌟 修正點：確保正確取得 setup 中儲存的項目 (有時可能叫 avatar 或 characterId)
        const charId = profile.characterId || profile.avatar || null;
        setMyAvatar(charId);
        if (profile.uid) setMyUid(profile.uid);
      }
    } catch (e) {
      console.error("讀取個人資料失敗:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  // ── Firebase 即時監聽隊伍成員，並去 users/{uid} 抓最新名稱與頭像 ──
  // ── Firebase 即時監聽隊伍成員，並去 users/{uid} 抓最新名稱與頭像 ──
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(
      doc(db, "adventures", id as string),
      async (snap) => {
        if (!snap.exists()) {
          console.log("⚠️ 找不到該冒險的資料！");
          return;
        }

        const rawMembers: any[] = snap.data().members || [];
        console.log("🔍 從 Firebase 抓到的原始成員資料:", rawMembers);

        const enriched = await Promise.all(
          rawMembers.map(async (m) => {
            // 🔴 關鍵防呆：判斷 Firebase 存的是單純的字串(UID) 還是 物件({uid: ...})
            const memberUid = typeof m === "string" ? m : m.uid;

            if (!memberUid) return m;

            try {
              const userSnap = await getDoc(doc(db, "users", memberUid));
              if (userSnap.exists()) {
                const u = userSnap.data();
                return {
                  ...(typeof m === "object" ? m : { uid: memberUid }),
                  uid: memberUid, // 確保物件一定有 uid 屬性，畫面才抓得到
                  name: u.displayName || u.name || m.name || "冒險者",
                  characterId: u.characterId || u.avatar || null,
                };
              }
            } catch (e) {
              console.warn("抓取成員資料失敗:", memberUid, e);
            }

            // 如果 users 裡找不到這個人，也要確保回傳格式正確的物件
            return typeof m === "object" ? m : { uid: memberUid };
          }),
        );

        console.log("✅ 補強後的成員資料:", enriched);
        setMembers(enriched);

        // 🌟 核心修改：把查好的完美頭像名單，順手存進手機保險箱！
        await AsyncStorage.setItem("@global_enriched_members", JSON.stringify(enriched));
      },
    );
    return () => unsub();
  }, [id]);

  // ── 分享隊伍 ID ──
  const onShare = async () => {
    try {
      await Share.share({
        message: `快來加入我的冒險【${name}】！隊伍 ID 是：${id}`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  // ── 離開隊伍 ──
  const handleLeave = async () => {
    setLeaveConfirmVisible(false);
    if (!id || !myUid) return;

    try {
      const adventureRef = doc(db, "adventures", id as string);
      const snap = await getDoc(adventureRef);
      if (snap.exists()) {
        const currentMembers: any[] = snap.data().members || [];
        const me = currentMembers.find((m) => m.uid === myUid);
        if (me) {
          await updateDoc(adventureRef, { members: arrayRemove(me) });
        }
      }

      const savedData = await AsyncStorage.getItem("@my_adventures_v2");
      if (savedData) {
        const list = JSON.parse(savedData);
        const updated = list.filter((adv: any) => adv.id !== id);
        await AsyncStorage.setItem(
          "@my_adventures_v2",
          JSON.stringify(updated),
        );
      }

      await AsyncStorage.removeItem("@current_adventure_id");

      Alert.alert("已離開隊伍", "你已成功退出此冒險。", [
        { text: "OK", onPress: () => router.replace("/home") },
      ]);
    } catch (e) {
      console.error("離開隊伍失敗:", e);
      Alert.alert("錯誤", "無法離開隊伍，請稍後再試");
    }
  };

  const isLeader = (uid: string) =>
    members.length > 0 && members[0].uid === uid;

  // ── 渲染單一成員列 ──
  const renderMember = (m: any, idx: number) => {
    const isSelf = m.uid === myUid;
    const displayName = isSelf ? myName : m.name || "冒險者";
    const borderColor = COLORS.line;

    // 🌟 修正點：如果是自己，拿最新的 myAvatar 狀態；如果是隊友，拿補強後的 m.characterId
    const characterId = isSelf ? myAvatar : m.characterId;
    const avatarSource = getCharacterSource(characterId);

    return (
      <View key={m.uid || idx} style={styles.memberRow}>
        {avatarSource ? (
          <Image
            source={avatarSource}
            style={[styles.memberAvatar, { borderColor }]}
          />
        ) : (
          <View style={[styles.memberAvatarPlaceholder, { borderColor }]}>
            <Text style={styles.placeholderQuestion}>?</Text>
          </View>
        )}
        <View style={styles.memberInfo}>
          <Text style={[styles.memberName, { color: themeColors.line }]}>{displayName}</Text>
          {isLeader(m.uid) && <Text style={[styles.memberBadge, { color: themeColors.primary }]}>隊長</Text>}
        </View>
      </View>
    );
  };

  const sortedMembers = [...members].sort((a, b) => {
    if (a.uid === myUid) return -1;
    if (b.uid === myUid) return 1;
    if (isLeader(a.uid)) return -1;
    if (isLeader(b.uid)) return 1;
    return 0;
  });

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 頂部自己的大頭像區 ── */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarWrapper, , { borderColor: themeColors.line }]}>
            {myAvatar && getCharacterSource(myAvatar) ? (
              <Image
                source={getCharacterSource(myAvatar)}
                style={styles.avatarImg}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.bigPlaceholderQuestion}>?</Text>
              </View>
            )}
          </View>
          <Text style={[styles.avatarName, { color: themeColors.line }]}>{myName.toUpperCase()}</Text>
        </View>

        {/* ── SETTING 卡片 ── */}
        <View style={[styles.card, { backgroundColor: themeColors.bg2, borderColor: themeColors.line }]}>
          <Text style={[styles.cardTitle, { color: themeColors.line }]}>SETTING</Text>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() =>
              router.push({ pathname: "/setup", params: { mode: "edit" } })
            }
          >
            <View style={styles.menuLeft}>
              <Image
                source={isDarkMode ? require("../../img/icon_edit_dark.png") : require("../../img/icon_edit.png")}
                style={{ height: 16, width: 16 }}
                resizeMode="contain"
              />
              <Text style={[styles.menuText, { color: themeColors.line }]}>編輯個人檔案</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setTutorialVisible(true)}
          >
            <View style={styles.menuLeft}>
              <Image
                source={isDarkMode ? require("../../img/icon_help_dark.png") : require("../../img/icon_help.png")}
                style={{ height: 18, width: 18 }}
                resizeMode="contain"
              />
              <Text style={[styles.menuText, { color: themeColors.line }]}>使用教學</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>


          <View style={styles.divider} />

          {/* 🌟 新增的深色模式切換按鈕 */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={toggleTheme}
            activeOpacity={0.8}
          >
            <View style={styles.menuLeft}>
              {/* 根據模式換小圖示 */}
              <Image
                source={isDarkMode ? require("../../img/icon_moon_dark.png") : require("../../img/icon_moon.png")}
                style={{ height: 18, width: 18 }}
                resizeMode="contain"
              />
              <Text style={[styles.menuText, { color: themeColors.line }]}>深色模式</Text>
            </View>
            {/* 內建的切換開關 */}
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: "#D7CCC8", true: "#EC7424" }}
              thumbColor={"#FFF"}
            />
          </TouchableOpacity>
        </View>

        {/* ── TEAM MEMBER 卡片 ── */}
        <View style={[styles.card, { backgroundColor: themeColors.bg2, borderColor: themeColors.line }]}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: themeColors.line }]}>TEAM MEMBER</Text>
            <TouchableOpacity onPress={onShare} style={styles.inviteBtn}>
              <Image
                source={isDarkMode ? require("../../img/icon_invite_dark.png") : require("../../img/icon_invite.png")}
                style={{ height: 20, width: 20 }}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>



          {members.length === 0 ? (
            <Text style={[styles.emptyMember, { color: themeColors.line }]}>尚無成員資料</Text>
          ) : (
            sortedMembers.map((m, idx) => renderMember(m, idx))
          )}

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.leaveRow}
            onPress={() => setLeaveConfirmVisible(true)}
          >
            <Image source={require("../../img/icon_exit.png")} style={{ height: 16, width: 16 }} resizeMode="contain" />
            <Text style={[styles.leaveText, { color: themeColors.primary }]}>離開隊伍</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ══ 使用教學 Modal ══ */}
      <Modal visible={tutorialVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.tutorialModal}>
            <Text style={styles.tutorialTitle}>📖 使用教學</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {TUTORIAL_STEPS.map((step, idx) => (
                <View key={idx} style={styles.tutorialStep}>
                  <View style={styles.tutorialStepHeader}>
                    <Text style={styles.tutorialStepIcon}>{step.icon}</Text>
                    <Text style={styles.tutorialStepTitle}>
                      {idx + 1}. {step.title}
                    </Text>
                  </View>
                  <Text style={styles.tutorialStepDesc}>{step.desc}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.tutorialCloseBtn}
              onPress={() => setTutorialVisible(false)}
            >
              <Text style={styles.tutorialCloseBtnText}>OK，我知道了！</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══ 離開確認 Modal ══ */}
      <Modal visible={leaveConfirmVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>離開隊伍</Text>
            <Text style={styles.confirmDesc}>
              確定要離開【{name}】嗎？{"\n"}
              離開後此冒險將不會出現在你的列表。
            </Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmCancelBtn]}
                onPress={() => setLeaveConfirmVisible(false)}
              >
                <Text style={styles.confirmCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmLeaveBtn]}
                onPress={handleLeave}
              >
                <Text style={styles.confirmLeaveText}>離開</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const BROWN = "#5E433B";
const LIGHT_BROWN = "#8D6E63";
const BG = "#F2EDE4";
const CARD_BG = "#FDFAF2";
const ORANGE = "#EC7424";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },

  // 頭像區
  avatarSection: { alignItems: "center", marginBottom: 8, gap: 10 },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: BROWN,
    overflow: "hidden",
    backgroundColor: COLORS.bg2,
    shadowColor: BROWN,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarPlaceholder: { flex: 1, backgroundColor: "#D7CCC8", justifyContent: "center", alignItems: "center" },
  bigPlaceholderQuestion: { fontSize: 32, fontWeight: "bold", color: BROWN },
  avatarName: { fontWeight: "bold", fontSize: 14, color: BROWN },

  // 卡片
  card: {
    backgroundColor: CARD_BG,
    borderWidth: 2,
    borderColor: BROWN,
    padding: 20,
    gap: 14,
    shadowColor: BROWN,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 4,
  },
  cardTitle: {
    fontFamily: "PressStart2P",
    fontSize: 12,
    color: LIGHT_BROWN,
    letterSpacing: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // 選單列
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuIcon: { fontSize: 18 },
  menuText: { fontSize: 16, color: BROWN, fontWeight: "bold" },
  menuChevron: { fontSize: 22, color: LIGHT_BROWN, fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "#D7CCC8" },

  // 邀請
  inviteBtn: { padding: 4 },
  inviteIcon: { fontSize: 20 },

  // 成員
  emptyMember: { color: LIGHT_BROWN, fontSize: 14, fontWeight: "bold" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  memberAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    backgroundColor: COLORS.bg2,
  },
  memberAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    backgroundColor: COLORS.bg2,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderQuestion: { fontSize: 18, fontWeight: "bold", color: BROWN },
  memberInfo: { gap: 4 },
  memberName: { fontSize: 16, color: BROWN, fontWeight: "bold" },
  memberBadge: {
    fontSize: 11,
    color: ORANGE,
    fontWeight: "bold",
    borderWidth: 1,
    borderColor: ORANGE,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: "flex-start",
  },

  // 離開
  leaveRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  leaveIcon: { fontSize: 18, color: ORANGE, fontWeight: "bold" },
  leaveText: { fontSize: 16, color: ORANGE, fontWeight: "bold" },

  // Modal 共用
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },

  // 教學 Modal
  tutorialModal: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: CARD_BG,
    borderWidth: 3,
    borderColor: BROWN,
    padding: 24,
    gap: 16,
  },
  tutorialTitle: {
    fontFamily: "PressStart2P",
    fontSize: 13,
    color: BROWN,
    textAlign: "center",
  },
  tutorialStep: { marginBottom: 18, gap: 6 },
  tutorialStepHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  tutorialStepIcon: { fontSize: 20 },
  tutorialStepTitle: { fontSize: 15, fontWeight: "bold", color: BROWN },
  tutorialStepDesc: {
    fontSize: 14,
    color: LIGHT_BROWN,
    lineHeight: 22,
    paddingLeft: 28,
  },
  tutorialCloseBtn: {
    backgroundColor: BROWN,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  tutorialCloseBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 15 },

  // 離開確認 Modal
  confirmModal: {
    width: "85%",
    backgroundColor: CARD_BG,
    borderWidth: 3,
    borderColor: BROWN,
    padding: 24,
    gap: 16,
  },
  confirmTitle: {
    fontFamily: "PressStart2P",
    fontSize: 13,
    color: BROWN,
    textAlign: "center",
  },
  confirmDesc: {
    fontSize: 15,
    color: LIGHT_BROWN,
    textAlign: "center",
    lineHeight: 24,
  },
  confirmBtnRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  confirmBtn: {
    flex: 1,
    padding: 14,
    borderWidth: 2,
    borderColor: BROWN,
    alignItems: "center",
  },
  confirmCancelBtn: { backgroundColor: "#F4F0E8" },
  confirmLeaveBtn: { backgroundColor: "#E84A41" },
  confirmCancelText: { fontWeight: "bold", color: BROWN, fontSize: 14 },
  confirmLeaveText: { fontWeight: "bold", color: "#FFF", fontSize: 14 },
});