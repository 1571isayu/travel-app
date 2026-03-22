import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import {
  Edit3,
  Image as ImageIcon,
  List,
  Map as MapIcon,
  MapPin,
  Trash2,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
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

// 🌟 解決 Web 環境下 react-native-maps 崩潰問題
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== "web") {
  const Maps = require("react-native-maps");
  MapView = Maps.default;
  Marker = Maps.Marker;
}

type TimelineItemType = {
  id: string;
  day: number;
  type: string;
  time: string;
  title: string;
  desc?: string;
  location?: string;
  isPast: boolean;
  mapUrl?: boolean;
  picUrl?: string | null;
  lat?: number;
  lng?: number;
};

export default function AdventureScreen() {
  const { name } = useLocalSearchParams();
  const adventureTitle = (Array.isArray(name) ? name[0] : name) || "未命名冒險";

  const [isReady, setIsReady] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [timeline, setTimeline] = useState<TimelineItemType[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const [daysCount, setDaysCount] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [taskType, setTaskType] = useState("spot");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskLocation, setTaskLocation] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskImage, setTaskImage] = useState<string | null>(null);

  const [viewImage, setViewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 彈窗內使用的時間
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // 🌟 核心：控制列表內哪個方塊被點開
  const [activeTimePicker, setActiveTimePicker] = useState<{
    id: string;
    type: "start" | "end";
  } | null>(null);

  const formatTime = useCallback((date: Date) => {
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedData = await AsyncStorage.getItem(
          `@timeline_${adventureTitle}`,
        );
        const savedDays = await AsyncStorage.getItem(`@days_${adventureTitle}`);
        if (savedData) setTimeline(JSON.parse(savedData));
        if (savedDays) setDaysCount(Number(savedDays));
      } catch (e) {
        console.error("讀取失敗", e);
      } finally {
        setIsReady(true);
      }
    };
    loadData();
  }, [adventureTitle]);

  useEffect(() => {
    if (isReady) {
      AsyncStorage.setItem(
        `@timeline_${adventureTitle}`,
        JSON.stringify(timeline),
      );
      AsyncStorage.setItem(`@days_${adventureTitle}`, daysCount.toString());
    }
  }, [timeline, daysCount, isReady, adventureTitle]);

  const parseTime = (timeStr: string) => {
    const [start, end] = timeStr.split(" - ");
    const parse = (t: string) => {
      const d = new Date();
      if (t) {
        const parts = t.trim().split(":");
        d.setHours(Number(parts[0]), Number(parts[1]));
      }
      return d;
    };
    return { s: parse(start), e: parse(end) };
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setTaskType("spot");
    setTaskTitle("");
    setTaskLocation("");
    setTaskDesc("");
    setTaskImage(null);
    setStartTime(new Date());
    setEndTime(new Date());
    setIsSaving(false);
  };

  const handleEdit = (item: TimelineItemType) => {
    setEditingId(item.id);
    setTaskType(item.type);
    setTaskTitle(item.title);
    setTaskLocation(item.location || "");
    setTaskDesc(item.desc || "");
    setTaskImage(item.picUrl || null);
    if (item.time) {
      const parsed = parseTime(item.time);
      setStartTime(parsed.s);
      setEndTime(parsed.e);
    }
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert("確定刪除？", "刪掉就回不來囉！", [
      { text: "取消", style: "cancel" },
      {
        text: "刪除",
        style: "destructive",
        onPress: () => setTimeline((prev) => prev.filter((t) => t.id !== id)),
      },
    ]);
  };

  const handleSaveTask = async () => {
    if (!taskTitle) return Alert.alert("提示", "請輸入標題！");
    setIsSaving(true);
    let newLat, newLng;
    if (taskLocation) {
      try {
        const geo = await Location.geocodeAsync(taskLocation);
        if (geo.length > 0) {
          newLat = geo[0].latitude;
          newLng = geo[0].longitude;
        }
      } catch (e) {
        console.log("定位解析失敗", e);
      }
    }

    const newTask: TimelineItemType = {
      id: editingId || Date.now().toString(),
      day: selectedDay,
      type: taskType,
      time: `${formatTime(startTime)} - ${formatTime(endTime)}`,
      title: taskTitle,
      location: taskLocation,
      desc: taskDesc,
      isPast: false,
      mapUrl: !!taskLocation,
      picUrl: taskImage,
      lat: newLat,
      lng: newLng,
    };

    if (editingId) {
      setTimeline((prev) =>
        prev.map((t) => (t.id === editingId ? newTask : t)),
      );
    } else {
      setTimeline((prev) => [...prev, newTask]);
    }
    handleCloseModal();
  };

  // 🌟 修改列表內的時間並直接儲存
  const handleDirectTimeChange = (
    id: string,
    newDate: Date,
    type: "start" | "end",
    currentTimeStr: string,
  ) => {
    const parsed = parseTime(currentTimeStr);
    let newStart = parsed.s;
    let newEnd = parsed.e;

    if (type === "start") newStart = newDate;
    if (type === "end") newEnd = newDate;

    const newTimeStr = `${formatTime(newStart)} - ${formatTime(newEnd)}`;
    setTimeline((prev) =>
      prev.map((t) => (t.id === id ? { ...t, time: newTimeStr } : t)),
    );
  };

  const currentDayTimeline = timeline.filter(
    (item) => item.day === selectedDay,
  );

  const renderTimelineItem = (item: TimelineItemType) => {
    const parsedTime = parseTime(item.time);

    return (
      <View key={item.id} style={styles.itemWrapper}>
        <View
          style={
            item.type === "warning"
              ? styles.dotWarning
              : item.type === "transport"
                ? styles.dotTransport
                : styles.dotNormal
          }
        />
        <View
          style={[styles.card, item.type === "warning" && styles.warningCard]}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            {/* 🌟 核心：方塊即開關 */}
            <View style={styles.compactTimeRow}>
              {/* 開始時間方塊 */}
              <TouchableOpacity
                style={[
                  styles.compactDropdown,
                  activeTimePicker?.id === item.id &&
                  activeTimePicker?.type === "start"
                    ? { backgroundColor: "#F4D03F" }
                    : { backgroundColor: "#FFFDF0" },
                ]}
                onPress={() =>
                  setActiveTimePicker(
                    activeTimePicker?.id === item.id &&
                      activeTimePicker?.type === "start"
                      ? null
                      : { id: item.id, type: "start" },
                  )
                }
              >
                <Text style={styles.compactTimeText}>
                  {formatTime(parsedTime.s)}
                </Text>
                <Text style={styles.compactArrow}>
                  {activeTimePicker?.id === item.id &&
                  activeTimePicker?.type === "start"
                    ? "▲"
                    : "▼"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.timeRangeDivider}>-</Text>

              {/* 結束時間方塊 */}
              <TouchableOpacity
                style={[
                  styles.compactDropdown,
                  activeTimePicker?.id === item.id &&
                  activeTimePicker?.type === "end"
                    ? { backgroundColor: "#F4D03F" }
                    : { backgroundColor: "#FFFDF0" },
                ]}
                onPress={() =>
                  setActiveTimePicker(
                    activeTimePicker?.id === item.id &&
                      activeTimePicker?.type === "end"
                      ? null
                      : { id: item.id, type: "end" },
                  )
                }
              >
                <Text style={styles.compactTimeText}>
                  {formatTime(parsedTime.e)}
                </Text>
                <Text style={styles.compactArrow}>
                  {activeTimePicker?.id === item.id &&
                  activeTimePicker?.type === "end"
                    ? "▲"
                    : "▼"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity onPress={() => handleEdit(item)}>
                <Edit3 size={16} color="#8D6E63" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Trash2 size={16} color="#E84A41" />
              </TouchableOpacity>
            </View>
          </View>

          {/* 🌟 咻！地彈出的滾輪 (僅在對應方塊點擊時出現) */}
          {activeTimePicker?.id === item.id && (
            <View style={styles.inlinePickerContainer}>
              <DateTimePicker
                value={
                  activeTimePicker.type === "start"
                    ? parsedTime.s
                    : parsedTime.e
                }
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                is24Hour={true}
                textColor="#4A342E"
                onChange={(event, date) => {
                  if (date)
                    handleDirectTimeChange(
                      item.id,
                      date,
                      activeTimePicker.type,
                      item.time,
                    );
                  if (Platform.OS === "android") setActiveTimePicker(null);
                }}
              />
            </View>
          )}

          <Text
            style={[
              styles.cardTitle,
              item.type === "warning" && { color: "#E84A41" },
            ]}
          >
            {item.type === "food"
              ? "🍔 "
              : item.type === "transport"
                ? "🚆 "
                : item.type === "warning"
                  ? "⚠️ "
                  : "⛩️ "}
            {item.title}
          </Text>

          <View style={styles.buttonRow}>
            {item.mapUrl && item.location && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnMap]}
                onPress={() =>
                  Linking.openURL(
                    `http://maps.google.com/?q=${encodeURIComponent(item.location!)}`,
                  )
                }
              >
                <MapPin size={12} color="#FFF" />
                <Text style={styles.btnText}>Map</Text>
              </TouchableOpacity>
            )}
            {item.picUrl && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnPic]}
                onPress={() => setViewImage(item.picUrl || null)}
              >
                <ImageIcon size={12} color="#4A342E" />
                <Text style={styles.btnTextDark}>圖片</Text>
              </TouchableOpacity>
            )}
          </View>
          {item.desc ? <Text style={styles.cardDesc}>{item.desc}</Text> : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.replace("/home")}
          style={{ marginRight: 10 }}
        >
          <Text style={{ fontSize: 20 }}>🔙</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          🗺️ {adventureTitle}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
          >
            {viewMode === "list" ? (
              <MapIcon size={16} color="#4A342E" />
            ) : (
              <List size={16} color="#4A342E" />
            )}
            <Text style={styles.toggleButtonText}>
              {viewMode === "list" ? "地圖" : "列表"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.daysContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysScroll}
        >
          {Array.from({ length: daysCount }).map((_, i) => {
            const day = i + 1;
            return (
              <TouchableOpacity
                key={day}
                style={[
                  styles.dayTab,
                  selectedDay === day && styles.dayTabActive,
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[
                    styles.dayTabText,
                    selectedDay === day && styles.dayTabTextActive,
                  ]}
                >
                  Day {day}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={styles.addDayBtn}
            onPress={() => setDaysCount((prev) => prev + 1)}
          >
            <Text style={styles.addDayText}>＋</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* 🌟 核心：判斷目前是要顯示列表還是地圖 */}
      {viewMode === "list" ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {currentDayTimeline.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                這天還沒有行程喔！{"\n"}趕快按右下角新增吧！
              </Text>
            </View>
          ) : (
            <View style={styles.timelineContainer}>
              <View style={styles.verticalLine} />
              {currentDayTimeline.map(renderTimelineItem)}
            </View>
          )}
        </ScrollView>
      ) : (
        /* 🌟 地圖畫面被加回來囉！ */
        <View style={styles.mapContainer}>
          {Platform.OS === "web" ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>網頁版暫不支援地圖顯示</Text>
            </View>
          ) : (
            MapView && (
              <MapView
                // 🌟 1. 加上 key：切換天數時，如果第一個景點改變，地圖就會重新跳轉對焦
                key={
                  currentDayTimeline.find((i) => i.lat && i.lng)?.id ||
                  "default-map"
                }
                style={styles.map}
                initialRegion={{
                  // 🌟 2. 自動抓取當天「第一個」有經緯度的行程。如果當天完全沒行程，預設會定位在台北 101
                  latitude:
                    currentDayTimeline.find((i) => i.lat && i.lng)?.lat ||
                    25.033,
                  longitude:
                    currentDayTimeline.find((i) => i.lat && i.lng)?.lng ||
                    121.5654,
                  latitudeDelta: 0.05, // 縮放比例，0.05 大概是看得到周邊街道的合適大小
                  longitudeDelta: 0.05,
                }}
              >
                {currentDayTimeline
                  .filter((i) => i.lat && i.lng)
                  .map((i) => (
                    <Marker
                      key={i.id}
                      coordinate={{ latitude: i.lat!, longitude: i.lng! }}
                      title={i.title}
                      description={i.time}
                    />
                  ))}
              </MapView>
            )
          )}
        </View>
      )}
      
      {viewMode === "list" && (
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.fabButtonText}>＋</Text>
        </TouchableOpacity>
      )}

      {/* 查看圖片用的 Modal */}
      <Modal visible={!!viewImage} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setViewImage(null)}
        >
          <View style={[styles.modalCard, { alignItems: "center" }]}>
            <Text style={styles.modalTitle}>🖼️ 圖片查看</Text>
            {viewImage && (
              <Image
                source={{ uri: viewImage }}
                style={{ width: "100%", height: 300, borderRadius: 10 }}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              style={[
                styles.modalBtn,
                styles.btnCancel,
                { width: "100%", marginTop: 20 },
              ]}
              onPress={() => setViewImage(null)}
            >
              <Text style={styles.btnCancelText}>關閉</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 新增/修改任務的 Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingId ? "✏️ 修改" : "＋ 新增"} Day {selectedDay} 任務
              </Text>
              <View style={styles.typeSelector}>
                {["spot", "food", "transport"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeBtn,
                      taskType === type && styles.typeBtnActive,
                    ]}
                    onPress={() => setTaskType(type)}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        taskType === type && styles.typeBtnTextActive,
                      ]}
                    >
                      {type === "spot"
                        ? "⛩️ 景點"
                        : type === "food"
                          ? "🍔 美食"
                          : "🚆 交通"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>時間區間</Text>
              <View style={styles.timePickerRow}>
                {/* 🌟 左側：開始時間方塊 */}
                <TouchableOpacity
                  style={[
                    styles.timeBtn,
                    showStartPicker && styles.timeBtnActive, // 判斷是否選中，變更為黃色
                  ]}
                  onPress={() => {
                    // 🌟 Toggle 切換邏輯：如果是開著的就關掉，關著的就打開
                    setShowStartPicker(!showStartPicker);
                    setShowEndPicker(false); // 確保另一個關閉
                  }}
                >
                  <Text style={styles.timeBtnText}>
                    {formatTime(startTime)}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.timeDivider}>～</Text>

                {/* 🌟 右側：結束時間方塊 */}
                <TouchableOpacity
                  style={[
                    styles.timeBtn,
                    showEndPicker && styles.timeBtnActive, // 判斷是否選中，變更為黃色
                  ]}
                  onPress={() => {
                    // 🌟 Toggle 切換邏輯：如果是開著的就關掉，關著的就打開
                    setShowEndPicker(!showEndPicker);
                    setShowStartPicker(false); // 確保另一個關閉
                  }}
                >
                  <Text style={styles.timeBtnText}>{formatTime(endTime)}</Text>
                </TouchableOpacity>
              </View>

              {/* 🌟 咻地滑出：彈窗內的時間選擇器 */}
              {(showStartPicker || showEndPicker) && (
                <View style={styles.inlinePickerContainer}>
                  <DateTimePicker
                    value={showStartPicker ? startTime : endTime}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    is24Hour={true}
                    textColor="#4A342E" // 🌟 補上深色文字，解決時間顏色消失的問題
                    onChange={(e, d) => {
                      if (d) showStartPicker ? setStartTime(d) : setEndTime(d);

                      // Android 點擊確認後自動收起
                      if (Platform.OS === "android" && e.type === "set") {
                        setShowStartPicker(false);
                        setShowEndPicker(false);
                      }
                    }}
                  />
                </View>
              )}

              <Text style={styles.inputLabel}>標題</Text>
              <TextInput
                style={styles.input}
                placeholder="例: 北海道"
                value={taskTitle}
                onChangeText={setTaskTitle}
              />
              <Text style={styles.inputLabel}>地點</Text>
              <TextInput
                style={styles.input}
                placeholder="例: 日本都道府縣"
                value={taskLocation}
                onChangeText={setTaskLocation}
              />
              <Text style={styles.inputLabel}>備註</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="輸入備註..."
                multiline
                value={taskDesc}
                onChangeText={setTaskDesc}
              />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.btnCancel]}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.btnCancelText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.btnSave]}
                  onPress={handleSaveTask}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.btnSaveText}>儲存</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFDF0" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingTop: 60,
    paddingBottom: 15,
  },
  headerTitle: { flex: 1, fontSize: 14, color: "#4A342E", fontWeight: "bold" },
  headerActions: {
    flexDirection: "row",
    gap: 10,
    alignSelf: "flex-end", // 確保在 space-between 的 header 中置右
  },
  // 🌟 修改：確保地圖按鈕單獨置右
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#AED6F1", // 淡藍色背景
    borderWidth: 2, // 粗邊框
    borderColor: "#4A342E",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 4,
    marginLeft: "auto", // 如果 space-between 失效，強制置右
  },

  // 🌟 新增：右下角綠色圈圈新增行程按鈕的容器
  fabButton: {
    position: "absolute",
    bottom: 20, // 距離底部 20
    right: 20, // 距離右側 20
    width: 60, // 寬度
    height: 60, // 高度 (圓形)
    borderRadius: 30, // 圓形 (寬度的一半)
    backgroundColor: "#2ECC71", // 🌟 用戶需求：綠色背景
    justifyContent: "center",
    alignItems: "center",
    elevation: 5, // Android 陰影
    shadowColor: "#000", // iOS 陰影
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    borderWidth: 2, // 皮克敏風格的粗邊框
    borderColor: "#4A342E",
  },
  // 🌟 新增：綠色圈圈內的大白色 ＋ 號
  fabButtonText: {
    color: "#FFF",
    fontSize: 30,
    fontWeight: "bold",
  },
  // 🌟 補回地圖的樣式
  mapContainer: { flex: 1 },
  map: { width: "100%", height: "100%" },
  toggleButtonText: {
    fontSize: 10,
    color: "#4A342E",
    marginLeft: 5,
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: "#F4D03F",
    borderWidth: 2,
    borderColor: "#4A342E",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 4,
  },
  addButtonText: { fontSize: 10, color: "#4A342E", fontWeight: "bold" },
  daysContainer: {
    borderBottomWidth: 4,
    borderBottomColor: "#D7CCC8",
    backgroundColor: "#FFFDF0",
    paddingBottom: 10,
  },
  daysScroll: { paddingHorizontal: 15, gap: 10, alignItems: "center" },
  dayTab: {
    backgroundColor: "#EFEBE9",
    borderWidth: 2,
    borderColor: "#4A342E",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 4,
  },
  dayTabActive: {
    backgroundColor: "#F4D03F",
    borderBottomWidth: 2,
    marginTop: 2,
  },
  dayTabText: { fontSize: 10, color: "#8D6E63", fontWeight: "bold" },
  dayTabTextActive: { color: "#4A342E" },
  addDayBtn: {
    backgroundColor: "#2ECC71",
    borderWidth: 2,
    borderColor: "#4A342E",
    width: 35,
    height: 35,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    borderBottomWidth: 4,
  },
  addDayText: { color: "#FFF", fontSize: 18, fontWeight: "bold" },
  scrollContent: { paddingBottom: 40 },
  timelineContainer: {
    position: "relative",
    paddingLeft: 40,
    paddingRight: 20,
    paddingTop: 30,
  },
  verticalLine: {
    position: "absolute",
    left: 20,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#4A342E",
  },
  itemWrapper: { position: "relative", marginBottom: 25 },
  dotNormal: {
    position: "absolute",
    left: -26,
    top: 15,
    width: 16,
    height: 16,
    backgroundColor: "#F4D03F",
    borderWidth: 3,
    borderColor: "#4A342E",
    borderRadius: 8,
  },
  dotWarning: {
    position: "absolute",
    left: -26,
    top: 15,
    width: 16,
    height: 16,
    backgroundColor: "#E84A41",
    borderWidth: 3,
    borderColor: "#4A342E",
  },
  dotTransport: {
    position: "absolute",
    left: -23,
    top: 10,
    width: 10,
    height: 10,
    backgroundColor: "#FFFDF0",
    borderWidth: 3,
    borderColor: "#4A342E",
    borderRadius: 5,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: "#4A342E",
    padding: 15,
    marginLeft: 10,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  warningCard: { borderColor: "#E84A41", borderWidth: 4 },

  compactTimeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  compactDropdown: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4A342E",
    borderBottomWidth: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  compactTimeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4A342E",
    marginRight: 4,
  },
  compactArrow: { fontSize: 8, color: "#E84A41" },
  timeRangeDivider: { fontSize: 14, fontWeight: "bold", color: "#8D6E63" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#888",
  },
  typeBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  //往下拉的那個框
  inlinePickerContainer: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#4A342E",
    marginVertical: 10,
    borderRadius: 8,
    overflow: "hidden",
    height: 200,
  },

  cardTitle: {
    fontSize: 16,
    color: "#4A342E",
    marginBottom: 10,
    fontWeight: "bold",
  },
  cardDesc: {
    fontSize: 12,
    color: "#4A342E",
    marginTop: 10,
    fontWeight: "bold",
  },
  buttonRow: { flexDirection: "row", gap: 10, marginTop: 5 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  btnMap: { backgroundColor: "#3498DB" },
  btnPic: { backgroundColor: "#BDC3C7" },
  btnText: { color: "#FFF", fontSize: 10, marginLeft: 4, fontWeight: "bold" },
  btnTextDark: {
    color: "#4A342E",
    fontSize: 10,
    marginLeft: 4,
    fontWeight: "bold",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(74, 52, 46, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  }, //彈出卡片的大小
  modalCard: {
    width: "85%",
    backgroundColor: "#FFFDF0",
    borderWidth: 4,
    borderColor: "#4A342E",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  modalTitle: {
    fontSize: 18,
    color: "#4A342E",
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  typeSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4A342E",
    marginHorizontal: 2,
  },
  typeBtnActive: { backgroundColor: "#F4D03F" },
  typeBtnText: { fontSize: 12, color: "#4A342E", fontWeight: "bold" },
  inputLabel: {
    fontSize: 12,
    color: "#4A342E",
    fontWeight: "bold",
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: "#4A342E",
    padding: 10,
    fontSize: 14,
    backgroundColor: "#FFF",
    color: "#4A342E",
  },
  textArea: { height: 80 },
  timePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  }, //時間的選項
  timeBtn: {
    flex: 1,
    backgroundColor: "#FFFDF0", // 🌟 初始狀態：米黃色
    borderWidth: 2,
    borderColor: "#4A342E",
    padding: 10,
    alignItems: "center",
    height: 40,
  },
  timeBtnActive: {
    backgroundColor: "#F4D03F", // 🌟 展開狀態：變為黃色
  },
  timeBtnText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A342E",
  },
  timeDivider: { marginHorizontal: 10, fontWeight: "bold" },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#4A342E",
    borderBottomWidth: 4,
  },
  btnCancel: { backgroundColor: "#EFEBE9", marginRight: 10 },
  btnSave: { backgroundColor: "#F4D03F" },
  btnCancelText: { color: "#8D6E63", fontWeight: "bold" },
  btnSaveText: { color: "#4A342E", fontWeight: "bold" },
});
