import { arrayUnion, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig"; // 🌟 確保從正確的相對路徑引入 db

import { COLORS, fieldStyles, texts } from "@/constants/theme";
import {
  PressStart2P_400Regular,
  useFonts,
} from "@expo-google-fonts/press-start-2p";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

// 語系設定
LocaleConfig.locales["tw"] = {
  monthNames: [
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月",
  ],
  monthNamesShort: [
    "1月",
    "2月",
    "3月",
    "4月",
    "5月",
    "6月",
    "7月",
    "8月",
    "9月",
    "10月",
    "11月",
    "12月",
  ],
  dayNames: [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
  ],
  dayNamesShort: ["日", "一", "二", "三", "四", "五", "六"],
  today: "今天",
};
LocaleConfig.defaultLocale = "tw";

type AdventureRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  peopleCount: number;
  isCreator?: boolean; // 🌟 新增：用來區分是自創還是加入別人的
};

// 角色的顏色列表
const BORDER_COLORS = [
  "#E84A41",
  "#3A86FF",
  "#38B000",
  "#FFB703",
  "#702AF8",
  "#FF007F",
];

const ensureUserProfile = async () => {
  const storedProfile = await AsyncStorage.getItem("@user_profile");
  let profile = storedProfile ? JSON.parse(storedProfile) : {};

  if (!profile.uid) {
    profile.uid = "user_" + Math.random().toString(36).substring(2, 11);
    profile.color =
      BORDER_COLORS[Math.floor(Math.random() * BORDER_COLORS.length)];
    profile.name =
      profile.name || "冒險者_" + Math.random().toString(36).substring(2, 5);
    profile.avatar = profile.avatar || null;
    await AsyncStorage.setItem("@user_profile", JSON.stringify(profile));
  }
  return profile;
};

const getNextDay = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + 1);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
};

export default function HomeScreen() {
  const router = useRouter();

  // 🌟【新功能 1】建立房間的邏輯
  const handleCreateAdventure = async (
    name: string,
    start: string,
    end: string,
  ) => {
    if (!name || !start || !end) {
      Alert.alert("提示", "請輸入標題並選擇完整日期區間！");
      return;
    }

    try {
      const userProfile = await ensureUserProfile();
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();

      // 1. 寫入 Firebase
      await setDoc(doc(db, "adventures", roomId), {
        id: roomId,
        name: name,
        startDate: start,
        endDate: end,
        createdAt: new Date().toISOString(),
        members: [userProfile],
      });

      // 2. 同步保存到本地歷史紀錄（SELECT 區塊才看得到自己建立過哪些房間）
      const newAdventure: AdventureRecord = {
        id: roomId,
        name: name,
        startDate: start,
        endDate: end,
        peopleCount: 1,
        isCreator: true, // 🌟 標記：這是自己創立的
      };
      const updatedList = [newAdventure, ...myAdventures];
      setMyAdventures(updatedList);
      await AsyncStorage.setItem(
        "@my_adventures_v2",
        JSON.stringify(updatedList),
      );

      Alert.alert("建立成功", `隊伍 ID: ${roomId}`);

      // 清空輸入框狀態
      setAdventureName("");
      setStartDate("");
      setEndDate("");
      setMarkedDates({});
      // 🌟 1. 建立房間後，把新的 roomId 存起來！
      await AsyncStorage.setItem("current_adventure_id", roomId);
      // 跳轉
      router.push({
        pathname: "/(tabs)/adventure",
        params: { id: roomId, name: name },
      });
    } catch (error) {
      console.error("建立線上冒險失敗:", error);
      Alert.alert("錯誤", "無法建立線上冒險行程");
    }
  };

  // 🌟【新功能 2】加入別人房間的邏輯
  const handleJoinAdventure = async (roomId: string) => {
    if (!roomId) return Alert.alert("提示", "請輸入隊伍 ID");
    const trimmedId = roomId.trim().toUpperCase();

    try {
      const userProfile = await ensureUserProfile();
      const docRef = doc(db, "adventures", trimmedId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const adventureData = docSnap.data();

        const isAlreadyMember = adventureData.members.some(
          (m: any) => m.uid === userProfile.uid,
        );
        if (!isAlreadyMember) {
          await updateDoc(docRef, {
            members: arrayUnion(userProfile),
          });
        }

        // 同步保存到本地歷史紀錄（這樣以後在 SELECT 區塊也可以直接點擊進入）
        const isExistInLocal = myAdventures.some((adv) => adv.id === trimmedId);
        if (!isExistInLocal) {
          const updatedDocSnap = await getDoc(docRef);
          const latestData = updatedDocSnap.data() || adventureData;
          const latestMembers = latestData.members || [];
          const joinedAdventure: AdventureRecord = {
            id: trimmedId,
            name: adventureData.name,
            startDate: adventureData.startDate,
            endDate: adventureData.endDate,
            peopleCount: latestMembers.length, // 🌟 確保撈到的是包含自己在內的最即時總人數
            isCreator: false, // 🌟 標記：這是加入別人的
          };
          const updatedList = [joinedAdventure, ...myAdventures];
          setMyAdventures(updatedList);
          await AsyncStorage.setItem(
            "@my_adventures_v2",
            JSON.stringify(updatedList),
          );
        }

        Alert.alert("成功加入", `已進入【${adventureData.name}】的冒險隊伍！`);

        setJoinId(""); // 清空輸入框
        // 🌟 2. 加入房間後，把目標 trimmedId 存起來！
        await AsyncStorage.setItem("current_adventure_id", trimmedId);
        router.push({
          pathname: "/(tabs)/adventure",
          params: { id: trimmedId, name: adventureData.name },
        });
      } else {
        Alert.alert("失敗", "找不到該隊伍 ID，請重新確認");
      }
    } catch (error) {
      console.error("加入冒險失敗:", error);
      Alert.alert("錯誤", "加入房間時發生錯誤");
    }
  };

  let [fontsLoaded] = useFonts({ PressStart2P_400Regular });

  // --- 正式狀態 ---
  const [adventureName, setAdventureName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [markedDates, setMarkedDates] = useState<any>({});

  // --- 暫存狀態 ---
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [tempMarkedDates, setTempMarkedDates] = useState<any>({});

  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [myAdventures, setMyAdventures] = useState<AdventureRecord[]>([]);
  // --- 🌟 刪除提示框專用狀態 ---
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState<string | null>(null);
  useEffect(() => {
    const loadAndSyncAdventures = async () => {
      try {
        // 1. 先快速讀取本地快取，讓畫面不卡頓
        const savedData = await AsyncStorage.getItem("@my_adventures_v2");
        let localList: AdventureRecord[] = savedData ? JSON.parse(savedData) : [];
        if (localList.length > 0) {
          setMyAdventures(localList);
        }

        // 2. 🌟 聯動雲端：遍歷本地的房間 ID，去 Firebase 抓取最新的人數與資料
        if (localList.length > 0) {
          const updatedList = await Promise.all(
            localList.map(async (adv) => {
              try {
                const docRef = doc(db, "adventures", adv.id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                  const cloudData = docSnap.data();
                  const membersCount = (cloudData.members || []).length;

                  return {
                    ...adv,
                    name: cloudData.name || adv.name,
                    startDate: cloudData.startDate || adv.startDate,
                    endDate: cloudData.endDate || adv.endDate,
                    peopleCount: membersCount, // 🌟 自動同步 Firebase 雲端最新成員總人數
                  };
                }
              } catch (err) {
                console.error(`同步房間 ${adv.id} 失敗:`, err);
              }
              return adv; // 如果雲端找不到或失敗，維持原樣
            })
          );

          // 3. 更新狀態並寫回本地快取
          setMyAdventures(updatedList);
          await AsyncStorage.setItem("@my_adventures_v2", JSON.stringify(updatedList));
        }
      } catch (e) {
        console.error("讀取或同步歷史紀錄失敗", e);
      }
    };

    loadAndSyncAdventures();
  }, []);

  const openDateModal = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setTempMarkedDates(markedDates);
    setDateModalVisible(true);
  };

  const onDayPress = (day: any) => {
    const dateString = day.dateString;
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      setTempStartDate(dateString);
      setTempEndDate("");
      setTempMarkedDates({
        [dateString]: {
          startingDay: true,
          color: "#EC7424",
          textColor: "white",
        },
      });
    } else if (tempStartDate && !tempEndDate) {
      if (dateString < tempStartDate) {
        setTempStartDate(dateString);
        setTempMarkedDates({
          [dateString]: {
            startingDay: true,
            color: "#EC7424",
            textColor: "white",
          },
        });
      } else {
        setTempEndDate(dateString);
        let newMarked: any = {
          [tempStartDate]: {
            startingDay: true,
            color: "#EC7424",
            textColor: "white",
          },
        };
        let currDate = getNextDay(tempStartDate);
        while (currDate < dateString) {
          newMarked[currDate] = { color: "#fae2d1", textColor: "#5E433B" };
          currDate = getNextDay(currDate);
        }
        newMarked[dateString] = {
          endingDay: true,
          color: "#EC7424",
          textColor: "white",
        };
        setTempMarkedDates(newMarked);
      }
    }
  };

  const confirmDate = () => {
    if (!tempStartDate || !tempEndDate) {
      Alert.alert("提示", "請選擇完整的起迄日期！");
      return;
    }
    setStartDate(tempStartDate);
    setEndDate(tempEndDate);
    setMarkedDates(tempMarkedDates);
    setDateModalVisible(false);
  };

  // 🌟 3. 點擊歷史紀錄時，記得加 async，並把 adv.id 存起來！
  const handleSelectAdventure = async (adv: AdventureRecord) => {

    await AsyncStorage.setItem("current_adventure_id", adv.id);

    router.push({
      pathname: "/(tabs)/adventure",
      params: { id: adv.id, name: adv.name },
    });
  };

  const handleDeleteAdventure = (id: string) => {
    setSelectedDeleteId(id);    // 暫存要刪除的 ID
    setDeleteModalVisible(true); // 打開自訂的 Modal提示框
  };

  // 🌟 新增：按下 OK 後真正執行刪除的函數
  const confirmDeleteAdventure = async () => {
    if (!selectedDeleteId) return;

    const id = selectedDeleteId;
    const updatedList = myAdventures.filter((adv) => adv.id !== id);
    setMyAdventures(updatedList);
    await AsyncStorage.setItem(
      "@my_adventures_v2",
      JSON.stringify(updatedList),
    );

    // 關閉 Modal 並清空狀態
    setDeleteModalVisible(false);
    setSelectedDeleteId(null);
  };

  const renderPixelText = (text: string) => {
    const parts = text.split(/([\u4e00-\u9fa5]+)/g);
    return parts.map((part, index) => {
      const isChinese = /[\u4e00-\u9fa5]/.test(part);
      return (
        <Text
          key={index}
          style={{
            fontFamily: isChinese ? "Cubic11" : "PressStart2P",
            fontSize: isChinese ? 16 : 12,
          }}
        >
          {part}
        </Text>
      );
    });
  };

  if (!fontsLoaded)
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E433B" />
      </View>
    );

  return (
    <SafeAreaView style={styles.home_content}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.innerContainer}>
          <View style={styles.header}>

            <View style={styles.headerTextCenter}>
              <Text style={texts.title2}>ADVENTURE</Text>
              <Text style={texts.subtitle}>開啟你的冒險</Text>
            </View>
          </View>

          <ScrollView
            style={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.scrollContent}>
              {/* CREATE SECTION */}
              {/* 🌟 用 Pressable 包裹整個大格子 */}
              <Pressable
                onPress={() => handleCreateAdventure(adventureName, startDate, endDate)}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.create_container,
                      pressed && { transform: [{ translateY: 2 }] }, // 整個格子一起往下動 2 單位
                    ]}
                  >
                    {/* title_group 移除了獨立的移動效果，改由外層的 pressed 統一控制 */}
                    <View style={styles.title_group}>
                      <Text style={texts.title20}>CREATE</Text>
                      <View>
                        {/* 原本 title_group 的獨立按鈕效果拿掉，同步最外層格子的 pressed 狀態 */}
                        <Image
                          source={require("../img/caret_right.png")}
                          style={[styles.caret, { opacity: pressed ? 0 : 1 }]}
                        />
                        <Image
                          source={require("../img/caret_right_pressed.png")}
                          style={[
                            styles.caret,
                            styles.caret_absolute,
                            { opacity: pressed ? 1 : 0 },
                          ]}
                        />
                      </View>
                    </View>

                    {/* 輸入框加了 pointerEvents="auto"，確保點擊輸入框時是觸發打字，而不是讓格子下沉 */}
                    <TextInput
                      style={fieldStyles.textField}
                      placeholder="請輸入標題"
                      placeholderTextColor="#8D6E63"
                      value={adventureName}
                      onChangeText={setAdventureName}
                      pointerEvents="auto"
                    />

                    <TouchableOpacity
                      onPress={openDateModal}
                      activeOpacity={1} // 讓日期點擊時不要跟著外層閃爍或落差
                    >
                      <Text
                        style={[
                          fieldStyles.textField,
                          !startDate && !endDate ? { color: "#8D6E63" } : {},
                        ]}
                      >
                        {startDate && endDate ? `${startDate} ~ ${endDate}` : "請點擊選擇日期"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Pressable>
              {/* JOIN SECTION */}
              {/* 🌟 用 Pressable 包裹整個大格子 */}
              <Pressable onPress={() => handleJoinAdventure(joinId)}>
                {({ pressed }) => (
                  <View
                    style={[
                      styles.join_container,
                      pressed && { transform: [{ translateY: 2 }] }, // 整個格子一起往下動 2 單位
                    ]}
                  >
                    <View style={styles.title_group}>
                      <Text style={texts.title20}>JOIN</Text>
                      <View>
                        {/* 同步外層的 pressed 狀態 */}
                        <Image
                          source={require("../img/caret_right.png")}
                          style={[styles.caret, { opacity: pressed ? 0 : 1 }]}
                        />
                        <Image
                          source={require("../img/caret_right_pressed.png")}
                          style={[
                            styles.caret,
                            styles.caret_absolute,
                            { opacity: pressed ? 1 : 0 },
                          ]}
                        />
                      </View>
                    </View>

                    <TextInput
                      style={fieldStyles.textField}
                      placeholder="請輸入冒險ID"
                      placeholderTextColor="#8D6E63"
                      autoCapitalize="characters"
                      value={joinId}
                      onChangeText={setJoinId}
                      pointerEvents="auto"
                    />
                  </View>
                )}
              </Pressable>

              {/* SELECT SECTION */}
              <View style={styles.select_container}>
                <View style={styles.title_group}>
                  <Text style={texts.title20}>SELECT</Text>
                </View>
                {myAdventures.length === 0 ? (
                  <Text style={texts.subtitle2}>目前沒有冒險紀錄</Text>
                ) : (
                  myAdventures.map((adv) => {
                    // 動態判斷背景顏色：自創用橘色，加入用綠色
                    const cardBackgroundColor = adv.isCreator ? COLORS.secondary : COLORS.disable;

                    return (
                      // 🌟 1. 改用大 Pressable 包裹整張歷史字卡
                      // 🌟 改用一個統一的 Pressable 監聽「短按」與「長按」
                      <Pressable
                        key={adv.id}
                        onPress={() => handleSelectAdventure(adv)} // 👈 短按：直接進入房間
                        onLongPress={() => handleDeleteAdventure(adv.id)} // 👈 長按：跳出刪除提示框
                        delayLongPress={600} // 👈 觸發長按所需的秒數（單位微秒，600毫秒大約是 0.6 秒，手感最好）
                      >
                        {({ pressed }) => (
                          <View
                            style={[
                              styles.history_container,
                              { backgroundColor: cardBackgroundColor },
                              // 🌟 2. 根據按下狀態，動態切換陰影與下沉動態
                              pressed && { transform: [{ translateY: 2 }] },
                            ]}
                          >
                            <View style={styles.historyHeaderRow}>
                              <Text style={styles.historyName}>
                                {renderPixelText(
                                  adv.name ? adv.name.toUpperCase() : "UNTITLED",
                                )}
                              </Text>


                            </View>

                            <Text style={styles.historyDate}>
                              {adv.startDate} ~ {adv.endDate}
                            </Text>

                            <View style={styles.historyInfoRow}>
                              <Text style={styles.historyInfoText}>
                                <Image
                                  source={require("../img/icon_user.png")}
                                  style={{ width: 16, height: 18 }}
                                />{" "}{adv.peopleCount || 1}人
                                ID: {adv.id}{" "}
                              </Text>
                            </View>
                          </View>
                        )}
                      </Pressable>
                    );
                  })
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* DATE MODAL */}
      <Modal visible={isDateModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[texts.subtitle2, { textAlign: "center" }]}>
              設定冒險日期
            </Text>
            <Calendar
              markingType={"period"}
              markedDates={tempMarkedDates}
              onDayPress={onDayPress}
              theme={{
                selectedDayBackgroundColor: "#EC7424",
                todayTextColor: "#EC7424",
                dayTextColor: "#5E433B",
                textDayFontWeight: "bold",
              }}
            />
            <Text style={styles.dateHintText}>
              {!tempStartDate
                ? "請點選出發日"
                : !tempEndDate
                  ? "請點選結束日"
                  : `${tempStartDate} 至 ${tempEndDate}`}
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => setDateModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirmBtn]}
                onPress={confirmDate}
              >
                <Text style={styles.modalConfirmText}>確認</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* 🌟 CUSTOM DELETE MODAL */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.customDelModalContent}>

            {/* 標題與內文 */}
            <Text style={styles.customDelTitle}>DELETE?</Text>
            <Text style={styles.customDelSubtitle}>
              {renderPixelText("刪除後此冒險將無法復原！")}
            </Text>

            {/* 按鈕區塊 */}
            <View style={{ flexDirection: "row", gap: 15, marginTop: 5 }}>

              {/* CANCEL 按鈕 */}
              <Pressable
                style={{ flex: 1 }}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setSelectedDeleteId(null);
                }}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.customDelBtn,
                      styles.customDelCancelBtn,
                      pressed ? styles.delBtnPressedStyle : styles.delBtnShadowStyle,
                    ]}
                  >
                    <Text style={styles.customDelCancelText}>cancel</Text>
                  </View>
                )}
              </Pressable>

              {/* OK 按鈕 */}
              <Pressable
                style={{ flex: 1 }}
                onPress={confirmDeleteAdventure}
              >
                {({ pressed }) => (
                  <View
                    style={[
                      styles.customDelBtn,
                      styles.customDelOkBtn,
                      pressed ? styles.delBtnPressedStyle : styles.delBtnShadowStyle,
                    ]}
                  >
                    <Text style={styles.customDelCancelText}>OK</Text>
                  </View>
                )}
              </Pressable>

            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ... 你的樣式 Styles 區塊完全保留，不需要更動 ...
const styles = StyleSheet.create({
  home_content: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    width: "100%",
  },
  scrollContent: {
    gap: 20,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F0E8",
  },
  backButtonText: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 18,
    color: "#5E433B",
  },
  caret: {
    width: 30,
    height: 30,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  caret_absolute: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  headerTextCenter: {
    alignItems: "center",
  },
  pixelTitle: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 20,
    color: "#5E433B",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#8D6E63",
    fontWeight: "bold",
    marginTop: 8,
  },
  headerSpacer: {
    width: 24,
  },
  title_group: {
    height: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  create_container: {
    backgroundColor: COLORS.secondary,
    borderWidth: 2,
    borderColor: COLORS.line,
    padding: 20,
    justifyContent: "space-between",
    width: "100%",
    height: "auto",
    gap: 12,
    borderBottomWidth: 4,
  },
  join_container: {
    backgroundColor: COLORS.disable,
    borderWidth: 2,
    borderColor: COLORS.line,
    padding: 20,
    justifyContent: "space-between",
    width: "100%",
    height: "auto",
    gap: 12,
    borderBottomWidth: 4,
  },
  select_container: {
    backgroundColor: COLORS.bg2,
    borderWidth: 2,
    borderColor: COLORS.line,
    padding: 20,
    justifyContent: "space-between",
    width: "100%",
    height: "auto",
    gap: 12,
  },
  historyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,

  },
  historyName: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 12,
    color: "#4A342E",
    flex: 1,
    marginRight: 10,
    textShadowColor: "rgba(94, 67, 59, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  deleteTouch: {
    padding: 5,
    marginTop: -5,
    marginRight: -5,
  },
  deleteIcon: {
    width: 16,
    height: 16,
    resizeMode: "contain",
  },
  playIcon: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
  playIconSmall: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  pixelInput: {
    backgroundColor: "#F4F0E8",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 12,
    fontSize: 14,
    color: "#5E433B",
    fontWeight: "bold",
    marginBottom: 10,
  },
  pixelInputTouch: {
    backgroundColor: "#F4F0E8",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 12,
    marginBottom: 5,
  },
  inputText: {
    fontSize: 14,
    color: "#5E433B",
    fontWeight: "bold",
  },
  emptyText: {
    fontSize: 14,
    color: "#8D6E63",
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 10,
  },
  history_container: {
    backgroundColor: "#F6E3BD",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 12,
    borderBottomWidth: 4,
  },
  historyDate: {
    fontSize: 12,
    color: "#8D6E63",
    fontWeight: "bold",
    marginBottom: 8,
  },
  historyInfoRow: {
    flexDirection: "row",
    gap: 15,
  },
  historyInfoText: {
    fontSize: 12,
    color: "#4A342E",
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#FFF",
    borderWidth: 3,
    borderColor: "#4A342E",
    padding: 15,
    borderRadius: 8,
  },
  modalTitle: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 14,
    color: "#4A342E",
    textAlign: "center",
    marginBottom: 10,
  },
  dateHintText: {
    textAlign: "center",
    color: "#8D6E63",
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 10,
    fontSize: 14,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#4A342E",
    padding: 12,
    alignItems: "center",
  },
  modalCancelBtn: {
    backgroundColor: "#FFF8D6",
  },
  modalConfirmBtn: {
    backgroundColor: "#E84A41",
  },
  modalCancelText: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 10,
    color: "#4A342E",
  },
  modalConfirmText: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 10,
    color: "#FFF",
  },
  // 提示框外殼：白色基底、深色邊框、圓角
  customDelModalContent: {
    width: "85%",
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: "#4A342E", // 配合你原本的深色邊框線
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    gap: 16,
  },
  customDelTitle: {
    fontFamily: "PressStart2P",
    fontSize: 22,
    color: COLORS.line,
    letterSpacing: 1,
  },
  customDelSubtitle: {
    color: "#8D6E63",
    marginBottom: 8,
  },
  // 按鈕基礎樣式
  customDelBtn: {
    borderWidth: 2,
    borderColor: "#4A342E",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  // cancel 淺綠色背景 (根據你的圖稿吸色)
  customDelCancelBtn: {
    backgroundColor: COLORS.disable, // 帶灰感的像素粉綠
  },
  // OK 亮橘色背景 (根據你的圖稿吸色)
  customDelOkBtn: {
    backgroundColor: COLORS.primary, // 經典亮橘色
  },
  // 按鈕文字字型與顏色
  customDelCancelText: {
    fontFamily: "PressStart2P",
    fontSize: 14,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  customDelOkText: {
    fontFamily: "PressStart2P",
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  // 🌟 按鈕沒按下時的硬陰影（右和下加粗）
  delBtnShadowStyle: {
    borderRightWidth: 2,
    borderBottomWidth: 4,
  },
  // 🌟 按鈕按下時的下沉壓縮動態
  delBtnPressedStyle: {
    transform: [{ translateY: 2 }],
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  container_shadow_style: {
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 4,  // 下邊框加粗
    borderColor: COLORS.line,
  },
  container_pressed_style: {
    transform: [{ translateY: 2 }], // 按下時往右下沉
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderRightWidth: 2,   // 陰影壓扁
    borderBottomWidth: 2,
    borderColor: COLORS.line,
  },
});
