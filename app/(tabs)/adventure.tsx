import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  Plus,
  X
} from "lucide-react-native";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// 引入 Context (請確認這條路徑是否符合你現在的資料夾結構)
import { MenuContext } from "../../content/MenuContext";

// --- 型別定義 ---
type TimelineItemType = {
  id: string;
  day: number;
  type: string;
  time: string;
  title: string;
  desc?: string;
  location?: string;
  imageUris?: string[];
  isPast: boolean;
};

export default function AdventureScreen() {
  const { id, name } = useLocalSearchParams();
  const { openMenu } = useContext(MenuContext);

  // 基礎 State
  const [currentDay, setCurrentDay] = useState(1);
  const [totalDays, setTotalDays] = useState(1);
  const [adventureDates, setAdventureDates] = useState({ start: "", end: "" });
  const [items, setItems] = useState<TimelineItemType[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal 與 放大圖片 State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(
    null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  // 表單 State
  const [taskTitle, setTaskTitle] = useState("");
  const [taskLocation, setTaskLocation] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  // 🌟 修正：預設值改為空字串，才會顯示「請選擇行程類型」
  const [taskType, setTaskType] = useState("");
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  // 工具函數
  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    return parts.length === 3 ? `${parts[1]}.${parts[2]}` : dateStr;
  };

  // 讀取資料
  useEffect(() => {
    const fetchAdventureData = async () => {
      try {
        setLoading(true);
        const savedAdventures = await AsyncStorage.getItem("@my_adventures_v2");
        if (savedAdventures) {
          const adventures = JSON.parse(savedAdventures);
          const currentAdv = adventures.find((adv: any) => adv.id === id);
          if (currentAdv) {
            setAdventureDates({
              start: currentAdv.startDate,
              end: currentAdv.endDate,
            });
            const start = new Date(currentAdv.startDate);
            const end = new Date(currentAdv.endDate);
            const diffDays =
              Math.ceil(
                Math.abs(end.getTime() - start.getTime()) /
                (1000 * 60 * 60 * 24),
              ) + 1;
            setTotalDays(diffDays);
          }
        }
        const savedTimeline = await AsyncStorage.getItem(`@timeline_${id}`);
        if (savedTimeline) setItems(JSON.parse(savedTimeline));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAdventureData();
  }, [id]);

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingId(null);
    setTaskTitle("");
    setTaskLocation("");
    setTaskDesc("");
    // 🌟 修正：關閉時也重置為空字串
    setTaskType("");
    setStartTime(new Date());
    setEndTime(new Date());
    setShowStartPicker(false);
    setShowEndPicker(false);
    setShowTypePicker(false);
  };

  // 儲存邏輯
  const handleSaveTask = async () => {
    const taskData = {
      day: currentDay,
      time: `${formatTime(startTime)}~${formatTime(endTime)}`,
      title: taskTitle || "未命名行程",
      location: taskLocation,
      desc: taskDesc,
      // 🌟 修正：如果使用者都沒選，預設存成 "spot"
      type: taskType || "spot",
      isPast: false,
    };

    let newItems = editingId
      ? items.map((item) =>
        item.id === editingId ? { ...item, ...taskData } : item,
      )
      : [...items, { id: Date.now().toString(), ...taskData, imageUris: [] }];

    setItems(newItems);
    await AsyncStorage.setItem(`@timeline_${id}`, JSON.stringify(newItems));
    closeModal();
  };


  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const handleDeleteTask = (itemId: string) => {
    setDeleteTargetId(itemId);
    setIsDeleteModalVisible(true);
  };

  // 真正執行的刪除動作
  const confirmDelete = async () => {
    if (deleteTargetId) {
      const newItems = items.filter((i) => i.id !== deleteTargetId);
      setItems(newItems);
      await AsyncStorage.setItem(`@timeline_${id}`, JSON.stringify(newItems));
      setIsDeleteModalVisible(false);
      setDeleteTargetId(null);
    }
  };
  // 多圖選擇邏輯
  const pickImages = async (itemId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const newUris = result.assets.map((asset) => asset.uri);
      const newItems = items.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            imageUris: [...(item.imageUris || []), ...newUris],
          };
        }
        return item;
      });
      setItems(newItems);
      await AsyncStorage.setItem(`@timeline_${id}`, JSON.stringify(newItems));
    }
  };

  const currentDayItems = items
    .filter((i) => i.day === currentDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (loading)
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#4A342E" />
      </View>
    );
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
  return (
    <View style={styles.container}>
      {/* 頂部 Header */}
      <View style={styles.header}>
        {/* 🌟 修正這裡：由 router.back() 改為 router.replace() */}
        <TouchableOpacity onPress={() => router.replace("/home")}>
          <Image
            source={require("../../img/icon_chevronLeft.png")}
            style={{ height: 14, aspectRatio: 1 }}
            resizeMode="contain"
          />
        </TouchableOpacity>


        <View style={styles.headerTitleContainer}>
          {/* 🌟 標題部分：根據輸入內容自動切換字體 */}
          <Text style={styles.headerTitle}>
            {renderPixelText(name ? name.toString().toUpperCase() : "MY ADVENTURE")}
          </Text>

          {/* 🌟 日期部分：通常是數字跟符號，直接用 Press Start 2P 即可 */}
          <Text style={[styles.headerDate, { fontFamily: "PressStart2P", fontSize: 10, marginTop: 5 }]}>
            {`${formatShortDate(adventureDates.start)}~${formatShortDate(adventureDates.end)}`}
          </Text>
        </View>
        <TouchableOpacity onPress={openMenu}>
          <Image
            source={require("../../img/icon_menu.png")}
            style={{ height: 14, aspectRatio: 1 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* 天數切換欄 */}
      <View style={styles.daySelectorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayScrollContent}
        >
          {Array.from({ length: totalDays }).map((_, index) => (
            <TouchableOpacity
              key={index + 1}
              style={[
                styles.dayTab,
                currentDay === index + 1 && styles.dayTabActive,
              ]}
              onPress={() => setCurrentDay(index + 1)}
            >
              <Text
                style={[
                  styles.dayTabText,
                  currentDay === index + 1 && styles.dayTabTextActive,
                ]}
              >
                DAY {index + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Image
        source={require("../../img/ad_line.png")}
        style={styles.separatorLine}
      />

      {/* 行程列表與時間軸 */}
      <ScrollView
        style={styles.timelineScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.timelineWrapper}>
          <View style={styles.verticalLine} />
          {currentDayItems.map((item) => (
            <View key={item.id} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTime}>{item.time}</Text>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingId(item.id);
                        setTaskTitle(item.title);
                        setTaskLocation(item.location || "");
                        setTaskDesc(item.desc || "");
                        setTaskType(item.type);
                        setIsModalVisible(true);
                      }}
                      style={styles.actionBtn}
                    >
                      <Image
                        source={require("../../img/icon_edit.png")}
                        style={{ height: 14, aspectRatio: 1 }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteTask(item.id)}
                      style={styles.actionBtn}
                    >
                      <Image
                        source={require("../../img/icon_delete.png")}
                        style={{ height: 14, aspectRatio: 1 }}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.cardTitle}>{item.title}</Text>

                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    onPress={() => {
                      // 1. 先檢查有沒有地址
                      if (!item.location) {
                        Alert.alert("提示", "這個行程還沒有輸入地址喔！");
                        return;
                      }

                      // 2. 將地址轉換成網址安全格式（處理空白與中文字）
                      const encodedAddress = encodeURIComponent(item.location);

                      // 3. 使用 Google Maps 官方的通用搜尋網址
                      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

                      Linking.openURL(googleMapsUrl).catch(() => {
                        Alert.alert("錯誤", "無法開啟地圖應用程式");
                      });
                    }}
                  >
                    <Image
                      source={require("../../img/icon_mapLink.png")}
                      style={{ height: 18, aspectRatio: 1 }}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => pickImages(item.id)}>
                    <Image
                      source={require("../../img/icon_image.png")}
                      style={{ height: 18, aspectRatio: 1 }}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flex: 1 }}
                  >
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {item.imageUris?.map((uri, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setSelectedFullImage(uri)}
                        >
                          <Image source={{ uri }} style={styles.miniImage} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 懸浮新增按鈕 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsModalVisible(true)}
      >
        <Plus size={32} color="#FFF" />
      </TouchableOpacity>

      {/* 放大圖片 Modal */}
      <Modal visible={!!selectedFullImage} transparent animationType="fade">
        <View style={styles.fullImageOverlay}>
          <TouchableOpacity
            style={styles.closeFullImage}
            onPress={() => setSelectedFullImage(null)}
          >
            <X color="#FFF" size={32} />
          </TouchableOpacity>
          {selectedFullImage && (
            <Image
              source={{ uri: selectedFullImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* 新增/編輯行程 Modal */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={styles.pixelTitleInput}
                placeholder="請輸入標題"
                placeholderTextColor="#8D6E63"
                value={taskTitle}
                onChangeText={setTaskTitle}
              />
              <Image
                source={require("../../img/ad_line.png")}
                style={styles.modalSeparator}
              />

              <Text style={styles.inputLabel}>時間</Text>
              <View style={styles.timePickerRow}>
                <TouchableOpacity
                  style={[
                    styles.pixelTimeBox,
                    showStartPicker && styles.activeTimeBox,
                  ]}
                  onPress={() => {
                    setShowStartPicker(!showStartPicker);
                    setShowEndPicker(false);
                  }}
                >
                  <Text style={[styles.pixelTimeText, { color: "#4A342E" }]}>
                    {formatTime(startTime)}
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.timeTilde, { color: "#4A342E" }]}>~</Text>
                <TouchableOpacity
                  style={[
                    styles.pixelTimeBox,
                    showEndPicker && styles.activeTimeBox,
                  ]}
                  onPress={() => {
                    setShowEndPicker(!showEndPicker);
                    setShowStartPicker(false);
                  }}
                >
                  <Text style={[styles.pixelTimeText, { color: "#4A342E" }]}>
                    {formatTime(endTime)}
                  </Text>
                </TouchableOpacity>
              </View>

              {(showStartPicker || showEndPicker) && (
                <View style={styles.inlinePickerContainer}>
                  <DateTimePicker
                    value={showStartPicker ? startTime : endTime}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    is24Hour={true}
                    textColor="#4A342E"
                    onChange={(e, d) => {
                      if (Platform.OS === "android") {
                        setShowStartPicker(false);
                        setShowEndPicker(false);
                      }
                      if (d) showStartPicker ? setStartTime(d) : setEndTime(d);
                    }}
                  />
                </View>
              )}

              <Text style={styles.inputLabel}>地址</Text>
              <TextInput
                style={styles.pixelInput}
                placeholder="請輸入地址"
                placeholderTextColor="#8D6E63"
                value={taskLocation}
                onChangeText={setTaskLocation}
              />

              <Text style={styles.inputLabel}>類型</Text>

              <View style={{ position: "relative", zIndex: 10 }}>
                {/* 點擊展開的標題框 */}
                <TouchableOpacity
                  style={[
                    styles.customDropdownHeader,
                    showTypePicker && { borderBottomWidth: 0 },
                  ]}
                  onPress={() => setShowTypePicker(!showTypePicker)}
                >
                  <Text
                    style={[
                      styles.customDropdownText,
                      taskType ? { color: "#4A342E" } : {},
                    ]}
                  >
                    {taskType === "spot"
                      ? "景點"
                      : taskType === "food"
                        ? "美食"
                        : taskType === "shopping"
                          ? "購物"
                          : taskType === "transport"
                            ? "交通"
                            : "請選擇行程類型"}
                  </Text>
                  <Image
                    source={require("../../img/icon_chevronDown.png")}
                    style={styles.dropdownIcon}
                  />
                </TouchableOpacity>

                {/* 展開後的選單列表 */}
                {showTypePicker && (
                  <View style={styles.customDropdownList}>
                    <TouchableOpacity
                      style={styles.customDropdownItem}
                      onPress={() => {
                        setTaskType("spot");
                        setShowTypePicker(false);
                      }}
                    >
                      <Text style={styles.customDropdownItemText}>景點</Text>
                      <Image
                        source={require("../../img/icon_star.png")}
                        style={styles.dropdownIcon}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.customDropdownItem}
                      onPress={() => {
                        setTaskType("food");
                        setShowTypePicker(false);
                      }}
                    >
                      <Text style={styles.customDropdownItemText}>美食</Text>
                      <Image
                        source={require("../../img/icon_food.png")}
                        style={styles.dropdownIcon}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.customDropdownItem}
                      onPress={() => {
                        setTaskType("shopping");
                        setShowTypePicker(false);
                      }}
                    >
                      <Text style={styles.customDropdownItemText}>購物</Text>
                      <Image
                        source={require("../../img/icon_shopping.png")}
                        style={styles.dropdownIcon}
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <Text style={styles.inputLabel}>備註</Text>
              <TextInput
                style={[styles.pixelInput, styles.pixelTextArea]}
                multiline
                placeholder="備註內容..."
                placeholderTextColor="#8D6E63"
                value={taskDesc}
                onChangeText={setTaskDesc}
              />

              <View style={styles.pixelBtnRow}>
                <TouchableOpacity
                  style={[styles.pixelBtn, { backgroundColor: "#D7CCC8" }]}
                  onPress={closeModal}
                >
                  <Text style={[styles.pixelBtnText, { color: "#4A342E" }]}>
                    CANCEL
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pixelBtn, { backgroundColor: "#F39C12" }]}
                  onPress={handleSaveTask}
                >
                  <Text style={[styles.pixelBtnText, { color: "#FFF" }]}>
                    SAVE
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* 自定義像素風刪除確認框 */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center' }]}>
            <Text style={[styles.pixelTitleInput, { fontSize: 18 }]}>DELETE？</Text>

            <Image
              source={require("../../img/ad_line.png")}
              style={styles.modalSeparator}
            />

            <Text style={{ color: "#8D6E63", marginBottom: 20 }}>刪除後此行程無法復原！</Text>

            <View style={styles.pixelBtnRow}>
              <TouchableOpacity
                style={[styles.pixelBtn, { backgroundColor: "#D7CCC8" }]}
                onPress={() => setIsDeleteModalVisible(false)}
              >
                <Text style={styles.pixelBtnText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pixelBtn, { backgroundColor: "#E74C3C" }]}
                onPress={confirmDelete}
              >
                <Text style={[styles.pixelBtnText, { color: "#FFF" }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// 樣式設定
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFBF0" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: {
    flexDirection: "row", // 確保文字水平排列
    alignItems: "center",
    color: "#4A342E",
    textShadowColor: '#4A342E',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0.1,
    // 這裡不要寫 fontFamily，交給 renderPixelText 處理
  },
  headerDate: { fontSize: 14, color: "#8D6E63" },
  daySelectorContainer: { marginVertical: 10 },
  dayScrollContent: { paddingHorizontal: 20, gap: 10 },
  dayTab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: "#4A342E",
    backgroundColor: "#FFF",
  },
  dayTabActive: { backgroundColor: "#4A342E" },
  dayTabText: { fontSize: 12, color: "#4A342E", fontWeight: "bold" },
  dayTabTextActive: { color: "#FFF" },
  separatorLine: { width: "100%", height: 15, resizeMode: "contain" },
  timelineScroll: { flex: 1 },
  timelineWrapper: {
    paddingHorizontal: 20,
    paddingTop: 10,
    position: "relative",
  },
  verticalLine: {
    position: "absolute",
    left: 27,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: "#4A342E",
  },
  timelineRow: { flexDirection: "row", marginBottom: 25 },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: 3,
    borderColor: "#4A342E",
    marginTop: 20,
    marginRight: 15,
    zIndex: 2,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#4A342E",
    padding: 15,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  cardTime: { fontSize: 13, color: "#8D6E63" },
  cardActions: { flexDirection: "row", alignItems: "center" },
  actionBtn: { marginLeft: 15 },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4A342E",
    marginVertical: 8,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginTop: 10,
  },
  miniImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#4A342E",
  },
  fullImageOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: { width: "95%", height: "80%" },
  closeFullImage: { position: "absolute", top: 50, right: 25, zIndex: 10 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4CAF50",
    borderWidth: 3,
    borderColor: "#4A342E",
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "90%",
    backgroundColor: "#FFF",
    borderWidth: 3,
    borderColor: "#4A342E",
    padding: 20,
    borderRadius: 10,
    maxHeight: "80%",
  },
  pixelTitleInput: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4A342E",
    textAlign: "center",
    padding: 10,
  },
  modalSeparator: {
    width: "100%",
    height: 10,
    resizeMode: "contain",
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 12,
    color: "#4A342E",
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  timePickerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pixelTimeBox: {
    flex: 1,
    backgroundColor: "#E8F5E9",
    borderWidth: 2,
    borderColor: "#4A342E",
    padding: 10,
    alignItems: "center",
  },
  activeTimeBox: { backgroundColor: "#F4D03F" },
  pixelTimeText: { fontWeight: "bold" },
  timeTilde: { fontSize: 18 },
  inlinePickerContainer: {
    backgroundColor: "#F5F5F5",
    marginTop: 10,
    borderWidth: 2,
    borderColor: "#4A342E",
  },
  pixelInput: {
    backgroundColor: "#E8F5E9",
    borderWidth: 2,
    borderColor: "#4A342E",
    padding: 10,
  },
  pickerWrapper: {
    borderWidth: 2,
    borderColor: "#4A342E",
    backgroundColor: "#FFF",
  },
  pixelTextArea: { height: 80, textAlignVertical: "top" },
  pixelBtnRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  pixelBtn: {
    flex: 1,
    padding: 15,
    borderWidth: 3,
    borderColor: "#4A342E",
    alignItems: "center",
  },
  pixelBtnText: { fontWeight: "bold", fontSize: 16 },
  customDropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FDFBF0",
    borderWidth: 2,
    borderColor: "#4A342E",
    padding: 12,
  },
  customDropdownText: {
    color: "#8D6E63",
    fontSize: 16,
    fontWeight: "bold",
  },
  customDropdownList: {
    backgroundColor: "#FDFBF0",
    borderWidth: 2,
    borderColor: "#4A342E",
    borderTopWidth: 2,
    marginTop: -2,
  },
  customDropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#4A342E",
  },
  customDropdownItemText: {
    color: "#8D6E63",
    fontSize: 16,
    fontWeight: "bold",
  },
  dropdownIcon: {
    width: 16,
    height: 16,
    resizeMode: "contain",
  },
  // 可以在樣式表裡加一個專屬刪除按鈕的顏色
  deleteBtn: {
    backgroundColor: "#E74C3C", // 鮮艷的紅色
    borderColor: "#4A342E",
    borderBottomWidth: 6,      // 增加底部厚度讓它看起來像遊戲按鈕
  },
});
