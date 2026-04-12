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
  View
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

//語系設定
LocaleConfig.locales["tw"] = {
  monthNames: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月",],
  monthNamesShort: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月",],
  dayNames: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六",],
  dayNamesShort: ["日", "一", "二", "三", "四", "五", "六"],
  today: "今天",
};
LocaleConfig.defaultLocale = "tw";

//型別定義
type AdventureRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  peopleCount: number;
};

//工具函式
// 🌟 新增：計算下一天的安全小工具 (避免跨時區出現日期少一天的 Bug)
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
  let [fontsLoaded] = useFonts({ PressStart2P_400Regular, });

  // 狀態管理
  const [adventureName, setAdventureName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [markedDates, setMarkedDates] = useState<any>({});
  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [myAdventures, setMyAdventures] = useState<AdventureRecord[]>([]);

  //載入歷史紀錄
  useEffect(() => {
    const loadAdventures = async () => {
      try {
        const savedData = await AsyncStorage.getItem("@my_adventures_v2");
        if (savedData) {
          setMyAdventures(JSON.parse(savedData));
        }
      } catch (e) {
        console.error("讀取歷史紀錄失敗", e);
      }
    };
    loadAdventures();
  }, []);

  //選擇日期邏輯
  // 🌟 更新：自動填滿中間日期的邏輯
  const onDayPress = (day: any) => {
    const dateString = day.dateString;

    // 1. 還沒選開始，或是想要重選
    if (!startDate || (startDate && endDate)) {
      setStartDate(dateString);
      setEndDate("");
      setMarkedDates({
        [dateString]: {
          startingDay: true,
          color: "#EC7424",
          textColor: "white",
        },
      });
    }
    // 2. 已經有開始日期，現在選結束日期
    else if (startDate && !endDate) {
      if (dateString < startDate) {
        // 如果點了比開始日更早的日期 -> 把它變成新的開始日
        setStartDate(dateString);
        setMarkedDates({
          [dateString]: {
            startingDay: true,
            color: "#EC7424",
            textColor: "white",
          },
        });
      } else if (dateString === startDate) {
        // 如果點了同一天 -> 變成單日遊
        setEndDate(dateString);
        setMarkedDates({
          [dateString]: {
            startingDay: true,
            endingDay: true,
            color: "#EC7424",
            textColor: "white",
          },
        });
      } else {
        // 正常選了未來的結束日期 -> 準備塗滿顏色！
        setEndDate(dateString);

        let newMarkedDates: any = {
          [startDate]: {
            startingDay: true,
            color: "#EC7424",
            textColor: "white",
          },
        };

        // 迴圈把中間的每一天都加上淺紅色
        let currDate = getNextDay(startDate);
        while (currDate < dateString) {
          newMarkedDates[currDate] = { color: "#fae2d1", textColor: "#5E433B" }; // 淺紅色底，深色字
          currDate = getNextDay(currDate);
        }

        // 標記結束日
        newMarkedDates[dateString] = {
          endingDay: true,
          color: "#EC7424",
          textColor: "white",
        };

        setMarkedDates(newMarkedDates);
      }
    }
  };

  //建立冒險
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

    router.replace({
      pathname: "/(tabs)/adventure",
      params: { id: newAdventure.id, name: newAdventure.name },
    });
  };

  const handleJoin = () => {
    if (!joinId) {
      Alert.alert("提示", "請輸入冒險 ID！");
      return;
    }
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
          try {
            const updatedList = myAdventures.filter((adv) => adv.id !== id);
            setMyAdventures(updatedList);
            await AsyncStorage.setItem("@my_adventures_v2", JSON.stringify(updatedList));
          } catch (e) {
            Alert.alert("錯誤", "刪除失敗");
          }
        },
      },
    ]);
  };
  const confirmDate = () => {
    if (!startDate || !endDate) {
      Alert.alert("提示", "請選擇完整的起迄日期！");
      return;
    }
    setDateModalVisible(false);
  };
  const renderPixelText = (text: string) => {
    // 將文字拆解，例如 "MY 冒險" 會變成 ["MY ", "冒險"]
    const parts = text.split(/([\u4e00-\u9fa5]+)/g);

    return parts.map((part, index) => {
      const isChinese = /[\u4e00-\u9fa5]/.test(part);
      return (
        <Text
          key={index}
          style={{
            // 🌟 如果是中文用 Cubic11，英數用 Press Start 2P
            fontFamily: isChinese ? "Cubic11" : "PressStart2P",
            fontSize: isChinese ? 16 : 12, // 英文像素通常較大，稍微調小一點視覺才平衡
          }}
        >
          {part}
        </Text>
      );
    });
  };

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E433B" />
      </View>
    );
  }

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
            bounces={true}
            alwaysBounceVertical={false}
          >
            <View style={styles.scrollContent}>
              <View style={styles.create_container}>
                <View style={styles.title_group}>
                  <Text style={texts.title20}>CREATE</Text>
                  <Pressable
                    onPress={handleCreate}
                    style={({ pressed }) => [
                      // 依然保留微幅下移的動感
                      pressed && { transform: [{ translateY: 2 }] },
                    ]}
                  >
                    {({ pressed }) => (
                      <View >
                        {/* 1. 平常顯示的箭頭 */}
                        <Image
                          source={require("../img/caret_right.png")}
                          style={[
                            styles.caret,
                            { opacity: pressed ? 0 : 1 } // 🌟 按下時隱藏
                          ]}
                        />

                        {/* 2. 按下時顯示的箭頭 (絕對定位疊在上面) */}
                        <Image
                          source={require("../img/caret_right_pressed.png")}
                          style={[
                            styles.caret,
                            styles.caret_absolute,
                            { opacity: pressed ? 1 : 0 } // 🌟 按下時顯示
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
                <TouchableOpacity
                  onPress={() => setDateModalVisible(true)}
                >
                  <Text
                    style={[fieldStyles.textField,
                    !startDate && !endDate ? { color: "#8D6E63" } : {},
                    ]}
                  >
                    {startDate && endDate
                      ? `${startDate} ~ ${endDate}`
                      : "請點擊選擇日期"}
                  </Text>
                </TouchableOpacity>

              </View>

              <View style={styles.join_container}>
                <View style={styles.title_group}>
                  <Text style={texts.title20}>JOIN</Text>
                  <Pressable
                    onPress={handleJoin}
                    style={({ pressed }) => [
                      // 依然保留微幅下移的動感
                      pressed && { transform: [{ translateY: 2 }] },
                    ]}
                  >
                    {({ pressed }) => (
                      <View >
                        {/* 1. 平常顯示的箭頭 */}
                        <Image
                          source={require("../img/caret_right.png")}
                          style={[
                            styles.caret,
                            { opacity: pressed ? 0 : 1 } // 🌟 按下時隱藏
                          ]}
                        />

                        {/* 2. 按下時顯示的箭頭 (絕對定位疊在上面) */}
                        <Image
                          source={require("../img/caret_right_pressed.png")}
                          style={[
                            styles.caret,
                            styles.caret_absolute,
                            { opacity: pressed ? 1 : 0 } // 🌟 按下時顯示
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
                          {/* 🌟 統一調用 renderPixelText，並將 adv.name 傳進去 */}
                          {renderPixelText(adv.name ? adv.name.toUpperCase() : "UNTITLED")}
                        </Text>
                        {/* 🌟 新增：刪除按鈕 */}
                        <TouchableOpacity
                          style={styles.deleteTouch}
                          onPress={() => handleDeleteAdventure(adv.id)}
                        >
                          <Image
                            source={require("../img/icon_delete.png")} // 請確保你有這張圖，或換成你的 X 圖標
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
                            style={{ width: 16, height: 18, }}
                          /> {adv.peopleCount}人
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

      <Modal
        visible={isDateModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[texts.subtitle2, { textAlign: "center" }]}>
              設定冒險日期
            </Text>

            <Calendar
              markingType={"period"}
              markedDates={markedDates}
              onDayPress={onDayPress}
              theme={{
                backgroundColor: "#ffffff",
                calendarBackground: "#ffffff",
                textSectionTitleColor: "#8D6E63",
                selectedDayBackgroundColor: "#EC7424",
                selectedDayTextColor: "#ffffff",
                todayTextColor: "#EC7424",
                dayTextColor: "#5E433B",
                textDisabledColor: "#C5D8BA",
                arrowColor: "#5E433B",
                monthTextColor: "#5E433B",
                textDayFontWeight: "bold",
                textMonthFontWeight: "bold",
                textDayHeaderFontWeight: "bold",
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 14,
              }}
            />

            <Text style={styles.dateHintText}>
              {!startDate
                ? "請點選出發日"
                : !endDate
                  ? "請點選結束日"
                  : `${startDate} 至 ${endDate}`}
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
    </SafeAreaView >
  );
}

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
    position: "absolute",  // 🌟 關鍵：讓這張圖浮在第一張圖正上方
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
