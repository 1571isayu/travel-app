import { COLORS, fieldStyles, icons, texts } from "@/constants/theme";
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
  let [fontsLoaded] = useFonts({ PressStart2P_400Regular });

  // --- 正式狀態 ---
  const [adventureName, setAdventureName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [markedDates, setMarkedDates] = useState<any>({});

  // --- 暫存狀態 (解決取消變更的 Bug) ---
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [tempMarkedDates, setTempMarkedDates] = useState<any>({});

  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [myAdventures, setMyAdventures] = useState<AdventureRecord[]>([]);

  useEffect(() => {
    const loadAdventures = async () => {
      try {
        const savedData = await AsyncStorage.getItem("@my_adventures_v2");
        if (savedData) setMyAdventures(JSON.parse(savedData));
      } catch (e) {
        console.error("讀取歷史紀錄失敗", e);
      }
    };
    loadAdventures();
  }, []);

  // 🌟 開啟 Modal 時，先拷貝一份目前的值到暫存區
  const openDateModal = () => {
    setTempStartDate(startDate);
    setTempEndDate(endDate);
    setTempMarkedDates(markedDates);
    setDateModalVisible(true);
  };

  // 🌟 點選日期時，操作的是 temp 狀態
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

  // 🌟 按下確認，才把 temp 同步回正式狀態
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

  const handleCreate = async () => {
    if (!adventureName || !startDate || !endDate) {
      Alert.alert("提示", "請輸入標題並選擇完整日期區間！");
      return;
    }
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newAdventure: AdventureRecord = {
      id: randomId,
      name: adventureName,
      startDate: startDate,
      endDate: endDate,
      peopleCount: 1,
    };
    const updatedList = [newAdventure, ...myAdventures];
    setMyAdventures(updatedList);
    await AsyncStorage.setItem(
      "@my_adventures_v2",
      JSON.stringify(updatedList),
    );
    setAdventureName("");
    setStartDate("");
    setEndDate("");
    setMarkedDates({});
    router.push({
      pathname: "/(tabs)/adventure",
      params: { id: newAdventure.id, name: newAdventure.name },
    });
  };

  const handleJoin = () => {
    if (!joinId) return Alert.alert("提示", "請輸入冒險 ID！");
    router.replace({
      pathname: "/(tabs)/adventure",
      params: { id: joinId, name: `連線隊伍 (${joinId})` },
    });
  };

  const handleSelectAdventure = (adv: AdventureRecord) => {
    router.replace({
      pathname: "/(tabs)/adventure",
      params: { id: adv.id, name: adv.name },
    });
  };

  const handleDeleteAdventure = (id: string) => {
    Alert.alert("刪除冒險", "確定要永久刪除這項冒險紀錄嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: async () => {
          const updatedList = myAdventures.filter((adv) => adv.id !== id);
          setMyAdventures(updatedList);
          await AsyncStorage.setItem(
            "@my_adventures_v2",
            JSON.stringify(updatedList),
          );
        },
      },
    ]);
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
            <TouchableOpacity onPress={() => router.back()}>
              <Image
                source={require("../img/icon_chevronLeft.png")}
                style={icons.icon14}
              />
            </TouchableOpacity>
            <View style={styles.headerTextCenter}>
              <Text style={texts.title2}>ADVENTURE</Text>
              <Text style={texts.subtitle}>開啟你的冒險</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.scrollContent}>
              {/* CREATE SECTION */}
              <View style={styles.create_container}>
                <View style={styles.title_group}>
                  <Text style={texts.title20}>CREATE</Text>
                  <Pressable onPress={handleCreate}>
                    {({ pressed }) => (
                      <View
                        style={pressed && { transform: [{ translateY: 2 }] }}
                      >
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
                    )}
                  </Pressable>
                </View>
                <TextInput
                  style={fieldStyles.textField}
                  placeholder="請輸入標題"
                  placeholderTextColor="#8D6E63"
                  value={adventureName}
                  onChangeText={setAdventureName}
                />

                {/* 🌟 點擊觸發暫存機制 */}
                <TouchableOpacity onPress={openDateModal}>
                  <Text
                    style={[
                      fieldStyles.textField,
                      !startDate && !endDate ? { color: "#8D6E63" } : {},
                    ]}
                  >
                    {startDate && endDate
                      ? `${startDate} ~ ${endDate}`
                      : "請點擊選擇日期"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* JOIN SECTION */}
              <View style={styles.join_container}>
                <View style={styles.title_group}>
                  <Text style={texts.title20}>JOIN</Text>
                  <Pressable onPress={handleJoin}>
                    {({ pressed }) => (
                      <View
                        style={pressed && { transform: [{ translateY: 2 }] }}
                      >
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
                    )}
                  </Pressable>
                </View>
                <TextInput
                  style={fieldStyles.textField}
                  placeholder="請輸入冒險ID"
                  placeholderTextColor="#8D6E63"
                  autoCapitalize="characters"
                  value={joinId}
                  onChangeText={setJoinId}
                />
              </View>

              {/* SELECT SECTION */}
              <View style={styles.select_container}>
                <View style={styles.title_group}>
                  <Text style={texts.title20}>SELECT</Text>
                </View>
                {myAdventures.length === 0 ? (
                  <Text style={texts.subtitle2}>目前沒有冒險紀錄</Text>
                ) : (
                  myAdventures.map((adv) => (
                    <TouchableOpacity
                      key={adv.id}
                      style={styles.history_container}
                      onPress={() => handleSelectAdventure(adv)}
                    >
                      <View style={styles.historyHeaderRow}>
                        <Text style={styles.historyName}>
                          {renderPixelText(
                            adv.name ? adv.name.toUpperCase() : "UNTITLED",
                          )}
                        </Text>
                        <TouchableOpacity
                          style={styles.deleteTouch}
                          onPress={() => handleDeleteAdventure(adv.id)}
                        >
                          <Image
                            source={require("../img/icon_delete.png")}
                            style={styles.deleteIcon}
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.historyDate}>
                        {adv.startDate} ~ {adv.endDate}
                      </Text>
                      <View style={styles.historyInfoRow}>
                        <Text style={styles.historyInfoText}>
                          <Image
                            source={require("../img/icon_user.png")}
                            style={{ width: 16, height: 18 }}
                          />{" "}
                          {adv.peopleCount}人
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
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
              markedDates={tempMarkedDates} // 🌟 使用 temp
              onDayPress={onDayPress} // 🌟 使用修正後的邏輯
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
    </SafeAreaView>
  );
}

// ... Styles 保持不變 ...

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
    justifyContent: "space-between",
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
    position: "absolute", // 🌟 關鍵：讓這張圖浮在第一張圖正上方
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
    alignItems: "flex-start", // 讓標題跟按鈕對齊頂部
    marginBottom: 8,
  },

  historyName: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 12,
    color: "#4A342E",
    flex: 1, // 🌟 讓標題佔滿剩餘空間，防止長標題擠到按鈕
    marginRight: 10,
    textShadowColor: "rgba(94, 67, 59, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  deleteTouch: {
    padding: 5, // 增加點擊感應範圍
    marginTop: -5, // 微調位置
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
});
