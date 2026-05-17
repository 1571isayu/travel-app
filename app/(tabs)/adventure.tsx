import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Plus, X } from "lucide-react-native";
import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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

import { icons } from "@/constants/theme";
import { MenuContext } from "../../content/MenuContext";

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
  createdBy: string;
};

export default function AdventureScreen() {
  const { id, name } = useLocalSearchParams();
  const { openMenu } = useContext(MenuContext);

  const [currentDay, setCurrentDay] = useState(1);
  const [totalDays, setTotalDays] = useState(1);
  const [adventureDates, setAdventureDates] = useState({ start: "", end: "" });
  const [items, setItems] = useState<TimelineItemType[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(
    null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  const [taskTitle, setTaskTitle] = useState("");
  const [taskLocation, setTaskLocation] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskType, setTaskType] = useState("");
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const [roomMembers, setRoomMembers] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);

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

  const openAddModal = () => {
    const todayItems = items
      .filter((i) => i.day === currentDay)
      .sort((a, b) => a.time.localeCompare(b.time));

    if (todayItems.length > 0) {
      const lastItem = todayItems[todayItems.length - 1];
      const lastEndTimeStr = lastItem.time.split("~")[1];
      const [hours, minutes] = lastEndTimeStr.split(":").map(Number);

      const nextStart = new Date();
      nextStart.setHours(hours, minutes, 0, 0);
      const nextEnd = new Date(nextStart);
      nextEnd.setHours(nextStart.getHours() + 1);

      setStartTime(nextStart);
      setEndTime(nextEnd);
    } else {
      setStartTime(new Date());
      setEndTime(new Date());
    }
    setEditingId(null);
    setIsModalVisible(true);
  };

  useEffect(() => {
    if (!id) return;

    AsyncStorage.getItem("@user_profile").then((str) => {
      if (str) setMyProfile(JSON.parse(str));
    });

    const unsubRoom = onSnapshot(
      doc(db, "adventures", id as string),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRoomMembers(data.members || []);

          if (data.startDate && data.endDate) {
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            setTotalDays(diffDays);
            setAdventureDates({ start: data.startDate, end: data.endDate });
          }
        }
      },
    );

    const itineraryRef = collection(
      db,
      "adventures",
      id as string,
      "itinerary",
    );
    const q = query(itineraryRef, orderBy("time", "asc"));

    const unsubItinerary = onSnapshot(q, (snapshot) => {
      const loadedItems: TimelineItemType[] = [];
      snapshot.forEach((docSnap) => {
        loadedItems.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as TimelineItemType);
      });

      setItems(loadedItems.filter((item) => item.day === currentDay));
      setLoading(false);
    });

    return () => {
      unsubRoom();
      unsubItinerary();
    };
  }, [id, currentDay]);

  const closeModal = () => {
    Keyboard.dismiss();
    setIsModalVisible(false);
    setEditingId(null);
    setTaskTitle("");
    setTaskLocation("");
    setTaskDesc("");
    setTaskType("");
    setShowStartPicker(false);
    setShowEndPicker(false);
    setShowTypePicker(false);
  };

  const handleSaveTask = () => {
    if (!taskTitle) {
      Alert.alert("提示", "請輸入行程標題");
      return;
    }
    const timeStr = `${formatTime(startTime)}~${formatTime(endTime)}`;
    handleSaveItem({
      type: taskType,
      time: timeStr,
      title: taskTitle,
      desc: taskDesc,
      location: taskLocation,
      isPast: false,
    });
    closeModal();
  };

  const handleSaveItem = async (
    newItemData: Omit<TimelineItemType, "id" | "createdBy" | "day">,
  ) => {
    if (!myProfile) {
      Alert.alert("錯誤", "無法辨識您的使用者身份，請重啟 App");
      return;
    }

    try {
      const itineraryRef = collection(
        db,
        "adventures",
        id as string,
        "itinerary",
      );

      await addDoc(itineraryRef, {
        ...newItemData,
        day: currentDay,
        createdBy: myProfile.uid,
      });
    } catch (error) {
      console.error("行程上傳失敗:", error);
      Alert.alert("錯誤", "無法同步行程到雲端");
    }
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const handleDeleteTask = (itemId: string) => {
    setDeleteTargetId(itemId);
    setIsDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (deleteTargetId) {
      const newItems = items.filter((i) => i.id !== deleteTargetId);
      setItems(newItems);
      await AsyncStorage.setItem(`@timeline_${id}`, JSON.stringify(newItems));
      setIsDeleteModalVisible(false);
      setDeleteTargetId(null);
    }
  };

  const handleDeleteImage = async (taskId: string, uriToDelete: string) => {
    Alert.alert("刪除照片", "確定要從此行程中移除這張照片嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "確定刪除",
        style: "destructive",
        onPress: async () => {
          const updatedItems = items.map((item) => {
            if (item.id === taskId) {
              return {
                ...item,
                imageUris: item.imageUris?.filter((uri) => uri !== uriToDelete),
              };
            }
            return item;
          });
          setItems(updatedItems);
          await AsyncStorage.setItem(
            `@timeline_${id}`,
            JSON.stringify(updatedItems),
          );
        },
      },
    ]);
  };

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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ gestureEnabled: false }} />

      {/* Header 區塊 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/home")}>
          <Image
            source={require("../../img/icon_chevronLeft.png")}
            style={{ height: 14, aspectRatio: 1 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {renderPixelText(
              name ? name.toString().toUpperCase() : "MY ADVENTURE",
            )}
          </Text>
          <Text
            style={[
              styles.headerDate,
              { fontFamily: "PressStart2P", fontSize: 10, marginTop: 5 },
            ]}
          >
            {`${formatShortDate(adventureDates.start)}~${formatShortDate(adventureDates.end)}`}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (id) {
              router.push({
                pathname: "/map",
                params: { id, name },
              });
            } else {
              Alert.alert("提示", "找不到行程 ID，無法開啟地圖");
            }
          }}
        >
          <Image
            source={require("../../img/icon_map.png")}
            style={{ height: 20, width: 20 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

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

      <ScrollView
        style={styles.timelineScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.timelineWrapper}>
          {currentDayItems.length > 0 && <View style={styles.verticalLine} />}
          {currentDayItems.length > 0 ? (
            currentDayItems.map((item) => {
              const creator = roomMembers.find((m) => m.uid === item.createdBy);
              const borderColor = creator?.color || "#5E433B";

              const avatarSource = creator?.avatar
                ? { uri: creator.avatar }
                : require("../../img/icon_user.png");

              return (
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

                            const [sTimeStr, eTimeStr] = item.time.split("~");
                            const [sH, sM] = sTimeStr.split(":").map(Number);
                            const [eH, eM] = eTimeStr.split(":").map(Number);
                            const d1 = new Date();
                            d1.setHours(sH, sM, 0, 0);
                            const d2 = new Date();
                            d2.setHours(eH, eM, 0, 0);
                            setStartTime(d1);
                            setEndTime(d2);

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
                    {item.desc ? (
                      <Text style={styles.cardDesc} numberOfLines={2}>
                        {item.desc}
                      </Text>
                    ) : null}

                    {/* 🌟 底部功能列（地圖、圖片、頭像都在這） */}
                    <View style={styles.cardFooter}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 15,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => {
                            if (!item.location)
                              return Alert.alert(
                                "提示",
                                "這個行程還沒有輸入地址喔！",
                              );
                            Linking.openURL(
                              `http://maps.google.com/?q=${encodeURIComponent(item.location)}`,
                            );
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
                      </View>

                      {/* 行程上傳的微縮照片滑動區 */}
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ flex: 1, marginLeft: 5 }}
                      >
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          {item.imageUris?.map((uri, idx) => (
                            <TouchableOpacity
                              key={idx}
                              onPress={() => setSelectedFullImage(uri)}
                              onLongPress={() =>
                                handleDeleteImage(item.id, uri)
                              }
                              delayLongPress={500}
                            >
                              <Image
                                source={{ uri }}
                                style={styles.miniImage}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>

                      {/* 🌟 移到右下角的小圓圈頭像 🌟 */}
                      <View
                        style={[
                          styles.tinyCreatorAvatarContainer,
                          { borderColor: borderColor },
                        ]}
                      >
                        <Image
                          source={avatarSource}
                          style={styles.tinyCreatorAvatar}
                        />
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyNotice}>
                <Text style={styles.emptyText}>這天還沒寫行程喔！</Text>
              </View>
            </View>
          )}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
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
        <Pressable
          style={styles.modalOverlay}
          onPress={() => Keyboard.dismiss()}
        >
          <View style={styles.modalCard}>
            <Pressable onPress={(e) => e.stopPropagation()} style={{ flex: 1 }}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={0}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 100 }}
                >
                  <View style={styles.modalHeader}>
                    <View style={icons.icon14}></View>
                    <TextInput
                      style={styles.pixelTitleInput}
                      placeholder="請輸入標題"
                      placeholderTextColor="#8D6E63"
                      value={taskTitle}
                      onChangeText={setTaskTitle}
                    />
                    <Image
                      source={require("../../img/icon_edit.png")}
                      style={[icons.icon14, { right: 0 }]}
                    />
                  </View>

                  <Image
                    source={require("../../img/ad_line.png")}
                    style={styles.modalSeparator}
                  />

                  <Text style={styles.inputLabel}>時間</Text>
                  <View style={styles.timePickerWrapper}>
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
                        <Text
                          style={[styles.pixelTimeText, { color: "#4A342E" }]}
                        >
                          {formatTime(startTime)}
                        </Text>
                      </TouchableOpacity>

                      <Text style={[styles.timeTilde, { color: "#4A342E" }]}>
                        ~
                      </Text>

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
                        <Text
                          style={[styles.pixelTimeText, { color: "#4A342E" }]}
                        >
                          {formatTime(endTime)}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {(showStartPicker || showEndPicker) && (
                      <View style={styles.inlinePickerContainer}>
                        <DateTimePicker
                          value={showStartPicker ? startTime : endTime}
                          mode="time"
                          style={{
                            height: 200,
                            transform: [{ scale: 0.9 }],
                          }}
                          display={
                            Platform.OS === "ios" ? "spinner" : "default"
                          }
                          is24Hour={false}
                          locale="zh_TW"
                          textColor="#4A342E"
                          onChange={(e, d) => {
                            if (Platform.OS === "android") {
                              setShowStartPicker(false);
                              setShowEndPicker(false);
                            }
                            if (d)
                              showStartPicker ? setStartTime(d) : setEndTime(d);
                          }}
                        />

                        {Platform.OS === "ios" && (
                          <TouchableOpacity
                            style={{ alignSelf: "center", marginBottom: 10 }}
                            onPress={() => {
                              setShowStartPicker(false);
                              setShowEndPicker(false);
                            }}
                          >
                            <Text
                              style={{ color: "#EC7424", fontWeight: "bold" }}
                            >
                              完成
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

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
                              : "請選擇行程類型"}
                      </Text>
                      <Image
                        source={require("../../img/icon_chevronDown.png")}
                        style={styles.dropdownIcon}
                      />
                    </TouchableOpacity>
                    {showTypePicker && (
                      <View style={styles.customDropdownList}>
                        {["spot", "food", "shopping"].map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={styles.customDropdownItem}
                            onPress={() => {
                              setTaskType(type);
                              setShowTypePicker(false);
                            }}
                          >
                            <Text style={styles.customDropdownItemText}>
                              {type === "spot"
                                ? "景點"
                                : type === "food"
                                  ? "美食"
                                  : "購物"}
                            </Text>
                            <Image
                              source={
                                type === "spot"
                                  ? require("../../img/icon_star.png")
                                  : type === "food"
                                    ? require("../../img/icon_food.png")
                                    : require("../../img/icon_shopping.png")
                              }
                              style={styles.dropdownIcon}
                            />
                          </TouchableOpacity>
                        ))}
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
                      <Text style={styles.pixelBtnText}>CANCEL</Text>
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
              </KeyboardAvoidingView>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* 刪除確認 Modal */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalCard, { alignItems: "center", height: "auto" }]}
          >
            <Text style={[styles.pixelTitleInput, { fontSize: 18 }]}>
              DELETE？
            </Text>
            <Image
              source={require("../../img/ad_line.png")}
              style={styles.modalSeparator}
            />
            <Text style={{ color: "#8D6E63", marginBottom: 20 }}>
              刪除後此行程無法復原！
            </Text>
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
  headerTitle: { flexDirection: "row", alignItems: "center", color: "#4A342E" },
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
    left: 25.5,
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
  actionBtn: { marginLeft: 10 },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#5E433B",
    marginVertical: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: "#8D6E63",
    lineHeight: 20,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // 🌟 確保內容兩端對齊
    marginTop: 10,
  },
  tinyCreatorAvatarContainer: {
    width: 26, // 🌟 讓頭像尺寸稍微精緻小巧
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    overflow: "hidden",
    backgroundColor: "#FFF",
    marginLeft: 10,
  },
  tinyCreatorAvatar: {
    width: "100%",
    height: "100%",
  },
  miniImage: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#5E433B",
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
    backgroundColor: "#EC7424",
    borderWidth: 3,
    borderColor: "#5E433B",
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
    backgroundColor: "#FFFDF9",
    borderWidth: 3,
    borderColor: "#5E433B",
    padding: 20,
    borderRadius: 10,
    height: 550,
    overflow: "hidden",
  },
  modalHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pixelTitleInput: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#5E433B",
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
    color: "#5E433B",
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
  },
  timePickerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pixelTimeBox: {
    flex: 1,
    backgroundColor: "#F4F0E8",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 10,
    alignItems: "center",
  },
  activeTimeBox: { backgroundColor: "#F4D03F" },
  pixelTimeText: { fontWeight: "bold" },
  timeTilde: { fontSize: 18 },

  timePickerWrapper: {
    width: "100%",
  },

  inlinePickerContainer: {
    backgroundColor: "#F4F0E8",
    borderWidth: 2,
    borderColor: "#5E433B",
    width: "100%",
    height: 180,
    overflow: "hidden",
    justifyContent: "center",
    top: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  pixelInput: {
    backgroundColor: "#E8F5E9",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 10,
  },
  pixelTextArea: { height: 80, textAlignVertical: "top" },
  pixelBtnRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  pixelBtn: {
    flex: 1,
    padding: 15,
    borderWidth: 3,
    borderColor: "#5E433B",
    alignItems: "center",
  },
  pixelBtnText: { fontWeight: "bold", fontSize: 16 },
  customDropdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFDF9",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 12,
  },
  customDropdownText: { color: "#8D6E63", fontSize: 16, fontWeight: "bold" },
  customDropdownList: {
    width: "100%",
    backgroundColor: "#FFFDF9",
    borderWidth: 2,
    borderColor: "#5E433B",
    position: "absolute",
    top: "100%",
    zIndex: 1000,
  },
  customDropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#5E433B",
  },
  customDropdownItemText: {
    color: "#8D6E63",
    fontSize: 16,
    fontWeight: "bold",
  },
  dropdownIcon: { width: 16, height: 16, resizeMode: "contain" },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
  },
  emptyNotice: {
    backgroundColor: "#FFFDF9",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: "#5E433B",
    borderRadius: 20,
  },
  emptyText: { color: "#5E433B", fontWeight: "bold", fontSize: 14 },
});
