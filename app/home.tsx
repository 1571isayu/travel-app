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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";

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
  location: string;
  peopleCount: number;
};

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

  let [fontsLoaded] = useFonts({
    PressStart2P_400Regular,
  });

  const [adventureName, setAdventureName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [markedDates, setMarkedDates] = useState<any>({});
  const [isDateModalVisible, setDateModalVisible] = useState(false);
  const [joinId, setJoinId] = useState("");
  const [myAdventures, setMyAdventures] = useState<AdventureRecord[]>([]);

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
      location: "未定地點",
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

  const confirmDate = () => {
    if (!startDate || !endDate) {
      Alert.alert("提示", "請選擇完整的起迄日期！");
      return;
    }
    setDateModalVisible(false);
  };

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

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E433B" />
      </View>
    );
  }

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.inner}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Image
                source={require("../img/icon_chevronLeft.png")}
                style={{ width: 14, height: 14 }}
              />
            </TouchableOpacity>
            <View style={styles.headerTextCenter}>
              <Text style={styles.pixelTitle}>ADVENTURE</Text>
              <Text style={styles.headerSubtitle}>開啟你的冒險</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.createCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.pixelCardTitle}>CREATE</Text>
                <TouchableOpacity onPress={handleCreate}>
                  <Image
                    source={require("../img/caret_right.png")}
                    style={styles.playIcon}
                  />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.pixelInput}
                placeholder="請輸入標題"
                placeholderTextColor="#8D6E63"
                value={adventureName}
                onChangeText={setAdventureName}
              />
              <TouchableOpacity
                style={styles.pixelInputTouch}
                onPress={() => setDateModalVisible(true)}
              >
                <Text
                  style={[
                    styles.inputText,
                    !startDate && !endDate ? { color: "#8D6E63" } : {},
                  ]}
                >
                  {startDate && endDate
                    ? `${startDate} ~ ${endDate}`
                    : "請點擊選擇日期"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.joinCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.pixelCardTitle}>JOIN</Text>
                <TouchableOpacity onPress={handleJoin}>
                  <Image
                    source={require("../img/caret_right.png")}
                    style={styles.playIcon}
                  />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.pixelInput}
                placeholder="請輸入冒險ID"
                placeholderTextColor="#8D6E63"
                autoCapitalize="characters"
                value={joinId}
                onChangeText={setJoinId}
              />
            </View>

            <View style={styles.selectCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.pixelCardTitle}>SELECT</Text>
              </View>

              {myAdventures.length === 0 ? (
                <Text style={styles.emptyText}>目前沒有冒險紀錄</Text>
              ) : (
                myAdventures.map((adv) => (
                  <TouchableOpacity
                    key={adv.id}
                    style={styles.historyItem}
                    onPress={() => handleSelectAdventure(adv)}
                  >
                    <View style={styles.historyHeaderRow}>
                      <Text style={styles.historyName}>
                        {adv.name.toUpperCase()}
                      </Text>
                      <Image
                        source={require("../img/caret_right.png")}
                        style={styles.playIconSmall}
                      />
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
            <Text style={styles.modalTitle}>設定冒險日期</Text>

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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F0E8",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F4F0E8",
  },
  inner: {
    flex: 1,
    paddingHorizontal: 25,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 18,
    color: "#5E433B",
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
  scrollContainer: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    gap: 20,
    paddingBottom: 40,
  },
  createCard: {
    backgroundColor: "#F6E3BD",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 15,
  },
  joinCard: {
    backgroundColor: "#C5D8BA",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 15,
  },
  selectCard: {
    backgroundColor: "#FFFDF9",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 15,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  pixelCardTitle: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 16,
    color: "#5E433B",
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
  historyItem: {
    backgroundColor: "#F6E3BD",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 12,
    marginBottom: 10,
  },
  historyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  historyName: {
    fontFamily: "PressStart2P_400Regular",
    fontSize: 12,
    color: "#4A342E",
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
