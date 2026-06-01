import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Plus, X } from "lucide-react-native";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MenuContext } from "../../content/MenuContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
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
  
  // 🌟 管理目前在 Modal 視窗中暫存、準備上傳或預覽的照片 URIs
  const [modalImageUris, setModalImageUris] = useState<string[]>([]);

  const [roomMembers, setRoomMembers] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<any>(null);

  const horizontalScrollRef = useRef<ScrollView>(null);
  const dayTabScrollRef = useRef<ScrollView>(null);

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
    setModalImageUris([]); 
    setIsModalVisible(true);
  };

  useEffect(() => {
    if (!id) return;

    AsyncStorage.setItem("@current_adventure_id", id as string).catch((err) =>
      console.error("儲存冒險 ID 失敗:", err),
    );

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

    const itineraryRef = collection(db, "adventures", id as string, "itinerary");
    const q = query(itineraryRef, orderBy("time", "asc"));

    const unsubItinerary = onSnapshot(q, (snapshot) => {
      const loadedItems: TimelineItemType[] = [];
      snapshot.forEach((docSnap) => {
        loadedItems.push({
          id: docSnap.id,
          ...docSnap.data(),
        } as TimelineItemType);
      });

      setItems(loadedItems);
      setLoading(false);
    });

    return () => {
      unsubRoom();
      unsubItinerary();
    };
  }, [id]);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const page = Math.round(contentOffsetX / SCREEN_WIDTH) + 1;
    if (page !== currentDay) {
      setCurrentDay(page);
      dayTabScrollRef.current?.scrollTo({
        x: (page - 1) * 75,
        animated: true,
      });
    }
  };

  const handleDayTabPress = (dayIndex: number) => {
    setCurrentDay(dayIndex);
    horizontalScrollRef.current?.scrollTo({
      x: (dayIndex - 1) * SCREEN_WIDTH,
      animated: true,
    });
  };

  const closeModal = () => {
    Keyboard.dismiss();
    setIsModalVisible(false);
    setEditingId(null);
    setTaskTitle("");
    setTaskLocation("");
    setTaskDesc("");
    setTaskType("");
    setModalImageUris([]);
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
      imageUris: modalImageUris, 
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
      if (editingId) {
        const itemRef = doc(db, "adventures", id as string, "itinerary", editingId);
        await updateDoc(itemRef, {
          ...newItemData,
          day: currentDay,
        });
      } else {
        const itineraryRef = collection(db, "adventures", id as string, "itinerary");
        await addDoc(itineraryRef, {
          ...newItemData,
          day: currentDay,
          createdBy: myProfile.uid,
        });
      }
    } catch (error) {
      console.error("行程儲存失敗:", error);
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
      try {
        const itemRef = doc(db, "adventures", id as string, "itinerary", deleteTargetId);
        await deleteDoc(itemRef);
      } catch (error) {
        console.error("刪除行程失敗:", error);
        Alert.alert("錯誤", "無法刪除行程，請稍後再試");
      }
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
          await AsyncStorage.setItem(`@timeline_${id}`, JSON.stringify(updatedItems));
        },
      },
    ]);
  };

  // 🌟 視窗內點擊大框框新增相片
  const pickImagesForModal = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const newUris = result.assets.map((asset) => asset.uri);
      setModalImageUris((prev) => [...prev, ...newUris]); 
    }
  };

  // 🌟 視窗內長按預覽相片移除
  const removeImageFromModal = (uriToRemove: string) => {
    Alert.alert("移除照片", "要從本次編輯中移除這張照片嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "移除",
        style: "destructive",
        onPress: () => {
          setModalImageUris((prev) => prev.filter((uri) => uri !== uriToRemove));
        }
      }
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
            {renderPixelText(name ? name.toString().toUpperCase() : "MY ADVENTURE")}
          </Text>
          <Text style={[styles.headerDate, { fontFamily: "PressStart2P", fontSize: 10, marginTop: 5 }]}>
            {`${formatShortDate(adventureDates.start)}~${formatShortDate(adventureDates.end)}`}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            if (id) {
              router.push({ pathname: "/map", params: { id, name } });
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

      {/* DAY 頂部選擇列 */}
      <View style={styles.daySelectorContainer}>
        <ScrollView
          ref={dayTabScrollRef}
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
              onPress={() => handleDayTabPress(index + 1)}
            >
              <Text style={[styles.dayTabText, currentDay === index + 1 && styles.dayTabTextActive]}>
                DAY {index + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Image source={require("../../img/ad_line.png")} style={styles.separatorLine} />

      {/* 橫向分頁滑動器 */}
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.mainHorizontalScroll}
      >
        {Array.from({ length: totalDays }).map((_, dayIndex) => {
          const targetDay = dayIndex + 1;
          const dayItems = items
            .filter((i) => i.day === targetDay)
            .sort((a, b) => a.time.localeCompare(b.time));

          return (
            <View key={targetDay} style={styles.pageContainer}>
              <ScrollView
                style={styles.timelineScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 }}
              >
                <View style={styles.timelineWrapper}>
                  {dayItems.length > 0 && <View style={styles.verticalLine} />}

                  {dayItems.length > 0 ? (
                    dayItems.map((item) => {
                      const creator = roomMembers.find((m) => m.uid === item.createdBy);
                      const borderColor = creator?.color || "#5E433B";
                      const avatarSource = creator?.avatar ? { uri: creator.avatar } : require("../../img/icon_user.png");

                      return (
                        <View key={item.id} style={styles.timelineRow}>
                          <View style={styles.timelineDot} />

                          {/* 點擊字卡編輯 */}
                          <Pressable
                            style={{ flex: 1 }}
                            delayLongPress={600}
                            onLongPress={() => {
                              if (item.createdBy !== myProfile?.uid) return;
                              handleDeleteTask(item.id);
                            }}
                            onPress={() => {
                              if (item.createdBy !== myProfile?.uid) return;
                              setEditingId(item.id);
                              setTaskTitle(item.title);
                              setTaskLocation(item.location || "");
                              setTaskDesc(item.desc || "");
                              setTaskType(item.type);
                              setModalImageUris(item.imageUris || []); 

                              const [sTimeStr, eTimeStr] = item.time.split("~");
                              const [sH, sM] = sTimeStr.split(":").map(Number);
                              const [eH, eM] = eTimeStr.split(":").map(Number);
                              const d1 = new Date(); d1.setHours(sH, sM, 0, 0);
                              const d2 = new Date(); d2.setHours(eH, eM, 0, 0);
                              setStartTime(d1); setEndTime(d2);
                              setIsModalVisible(true);
                            }}
                          >
                            {({ pressed }) => (
                              <View style={[styles.card, pressed && { opacity: 0.8 }]}>
                                <View style={styles.cardHeader}>
                                  <Text style={styles.cardTime}>{item.time}</Text>
                                  <View style={styles.cardActions} />
                                </View>

                                <Text style={styles.cardTitle}>{item.title}</Text>
                                {item.desc ? <Text style={styles.cardDesc} numberOfLines={2}>{item.desc}</Text> : null}

                                <View style={styles.cardFooter}>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
                                    <Image
                                      source={
                                        item.type === "spot"
                                          ? require("../../img/icon_star.png")
                                          : item.type === "food"
                                            ? require("../../img/icon_food.png")
                                            : require("../../img/icon_shopping.png")
                                      }
                                      style={{ height: 20, width: 20 }}
                                      resizeMode="contain"
                                    />
                                    
                                  </View>

                                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, marginLeft: 5 }}>
                                    <View style={{ flexDirection: "row", gap: 8 }}>
                                      {item.imageUris?.map((uri, idx) => (
                                        <TouchableOpacity key={idx} onPress={() => setSelectedFullImage(uri)} onLongPress={() => handleDeleteImage(item.id, uri)} delayLongPress={500}>
                                          <Image source={{ uri }} style={styles.miniImage} />
                                        </TouchableOpacity>
                                      ))}
                                    </View>
                                  </ScrollView>

                                  <View style={[styles.tinyCreatorAvatarContainer, { borderColor: borderColor }]}>
                                    <Image source={avatarSource} style={styles.tinyCreatorAvatar} />
                                  </View>
                                </View>
                              </View>
                            )}
                          </Pressable>
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
              </ScrollView>
            </View>
          );
        })}
      </ScrollView>

      {/* 底部加號按鈕 */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Plus size={32} color="#FFF" />
      </TouchableOpacity>

      {/* 放大圖片 Modal */}
      <Modal visible={!!selectedFullImage} transparent animationType="fade">
        <View style={styles.fullImageOverlay}>
          <TouchableOpacity style={styles.closeFullImage} onPress={() => setSelectedFullImage(null)}>
            <X color="#FFF" size={32} />
          </TouchableOpacity>
          {selectedFullImage && <Image source={{ uri: selectedFullImage }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>

      {/* 🌟 滿版由下往上滑出（推到底）的「新增/編輯行程」頁面 */}
      <Modal visible={isModalVisible} transparent={false} animationType="slide">
        <SafeAreaView style={styles.fullPageModalContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>

            {/* 頂部 Header */}
            <View style={styles.modalPageHeader}>
              <TouchableOpacity onPress={closeModal}>
                <Image source={require("../../img/icon_chevronLeft.png")} style={{ height: 16, width: 16 }} resizeMode="contain" />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: "center", marginHorizontal: 10 }}>
                <TextInput
                  style={[styles.pixelTitleInput, { padding: 0 }]}
                  placeholder="請在此輸入目的地"
                  placeholderTextColor="#8D6E63"
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  autoFocus={isModalVisible} // 自動跳出鍵盤
                />
              </View>
              <Image source={require("../../img/icon_edit.png")} style={{ height: 16, width: 16 }} resizeMode="contain" />
            </View>

            <Image source={require("../../img/ad_line.png")} style={styles.modalSeparator} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 }}
            >
              {/* 時間區塊 */}
              <Text style={styles.inputLabel}>時間</Text>
              <View style={styles.timePickerWrapper}>
                <View style={styles.timePickerRow}>
                  <TouchableOpacity style={[styles.pixelTimeBox, showStartPicker && styles.activeTimeBox]} onPress={() => { setShowStartPicker(!showStartPicker); setShowEndPicker(false); }}>
                    <Text style={[styles.pixelTimeText, { color: "#4A342E" }]}>{formatTime(startTime)}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.timeTilde, { color: "#4A342E" }]}>~</Text>
                  <TouchableOpacity style={[styles.pixelTimeBox, showEndPicker && styles.activeTimeBox]} onPress={() => { setShowEndPicker(!showEndPicker); setShowStartPicker(false); }}>
                    <Text style={[styles.pixelTimeText, { color: "#4A342E" }]}>{formatTime(endTime)}</Text>
                  </TouchableOpacity>
                </View>

                {(showStartPicker || showEndPicker) && (
                  <View style={styles.inlinePickerContainer}>
                    <DateTimePicker
                      value={showStartPicker ? startTime : endTime}
                      mode="time"
                      style={styles.dateTimePicker}
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      is24Hour={false}
                      locale="zh_TW"
                      textColor="#4A342E"
                      onChange={(e, d) => {
                        if (Platform.OS === "android") { setShowStartPicker(false); setShowEndPicker(false); }
                        if (d) showStartPicker ? setStartTime(d) : setEndTime(d);
                      }}
                    />
                    {Platform.OS === "ios" && (
                      <TouchableOpacity style={{ alignSelf: "center", marginBottom: 10 }} onPress={() => { setShowStartPicker(false); setShowEndPicker(false); }}>
                        <Text style={{ color: "#EC7424", fontWeight: "bold" }}>完成</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* 地址區塊 */}
              <Text style={styles.inputLabel}>地址</Text>
              <TextInput style={styles.pixelInput} placeholder="請輸入地址" placeholderTextColor="#8D6E63" value={taskLocation} onChangeText={setTaskLocation} />

              {/* 類型區塊 */}
              <Text style={styles.inputLabel}>類型</Text>
              <View style={{ position: "relative", zIndex: 10 }}>
                <TouchableOpacity style={[styles.customDropdownHeader, showTypePicker && { borderBottomWidth: 0 }]} onPress={() => setShowTypePicker(!showTypePicker)}>
                  <Text style={[styles.customDropdownText, taskType ? { color: "#4A342E" } : {}]}>
                    {taskType === "spot" ? "景點" : taskType === "food" ? "美食" : taskType === "shopping" ? "購物" : "請選擇行程類型"}
                  </Text>
                  <Image source={require("../../img/icon_chevronDown.png")} style={styles.dropdownIcon} />
                </TouchableOpacity>
                {showTypePicker && (
                  <View style={styles.customDropdownList}>
                    {["spot", "food", "shopping"].map((type) => (
                      <TouchableOpacity key={type} style={styles.customDropdownItem} onPress={() => { setTaskType(type); setShowTypePicker(false); }}>
                        <Text style={styles.customDropdownItemText}>{type === "spot" ? "景點" : type === "food" ? "美食" : "購物"}</Text>
                        <Image source={type === "spot" ? require("../../img/icon_star.png") : type === "food" ? require("../../img/icon_food.png") : require("../../img/icon_shopping.png")} style={styles.dropdownIcon} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* 備註區塊 */}
              <Text style={styles.inputLabel}>備註</Text>
              <TextInput style={[styles.pixelInput, styles.pixelTextArea]} multiline placeholder="請輸入備註..." placeholderTextColor="#8D6E63" value={taskDesc} onChangeText={setTaskDesc} />

              {/* 🌟 完美復刻 image_fef663.png 寬型大圖片方框 */}
              <Text style={styles.inputLabel}>圖片</Text>
              {modalImageUris.length === 0 ? (
                // 狀況 A：還沒有照片時，秀出設計稿原本的「點此上傳圖片+」大格子
                <TouchableOpacity style={styles.designAddImageFrame} onPress={pickImagesForModal}>
                  <Text style={styles.designAddImageFrameText}>點此上傳圖片+</Text>
                </TouchableOpacity>
              ) : (
                // 狀況 B：有照片時，在同一個大格子裡做橫向滾動預覽，長按一樣可刪除
                <View style={styles.designAddImageFrameActive}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                      {modalImageUris.map((uri, idx) => (
                        <TouchableOpacity 
                          key={idx} 
                          onPress={() => setSelectedFullImage(uri)} 
                          onLongPress={() => removeImageFromModal(uri)} 
                          delayLongPress={500}
                        >
                          <Image source={{ uri }} style={styles.designPreviewImage} />
                        </TouchableOpacity>
                      ))}
                      {/* 後方依然留一個貼心的加號，方便使用者繼續追加照片 */}
                      <TouchableOpacity style={styles.designMiniAddBtn} onPress={pickImagesForModal}>
                        <Plus size={20} color="#5E433B" />
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* 底部按鈕列：cancel & save */}
              <View style={styles.modalPageBtnRow}>
                <Pressable style={{ flex: 1 }} onPress={closeModal}>
                  {({ pressed }) => (
                    <View style={[styles.pageCustomBtn, styles.pageCancelBtn, pressed ? styles.pageBtnPressed : styles.pageBtnShadow]}>
                      <Text style={styles.pageCancelBtnText}>cancel</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable style={{ flex: 1 }} onPress={handleSaveTask}>
                  {({ pressed }) => (
                    <View style={[styles.pageCustomBtn, styles.pageSaveBtn, pressed ? styles.pageBtnPressed : styles.pageBtnShadow]}>
                      <Text style={styles.pageSaveBtnText}>save</Text>
                    </View>
                  )}
                </Pressable>
              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* 刪除確認 Modal */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: "center", height: "auto" }]}>
            <Text style={[styles.pixelTitleInput, { fontSize: 18 }]}>DELETE？</Text>
            <Image source={require("../../img/ad_line.png")} style={styles.modalSeparator} />
            <Text style={{ color: "#8D6E63", marginBottom: 20 }}>刪除後此行程無法復原！</Text>
            <View style={styles.pixelBtnRow}>
              <TouchableOpacity style={[styles.pixelBtn, { backgroundColor: "#D7CCC8" }]} onPress={() => setIsDeleteModalVisible(false)}>
                <Text style={styles.pixelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pixelBtn, { backgroundColor: "#E74C3C" }]} onPress={confirmDelete}>
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
    width: 75,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "#4A342E",
    backgroundColor: "#FFF",
    alignItems: "center",
  },
  dayTabActive: { backgroundColor: "#4A342E" },
  dayTabText: { fontSize: 12, color: "#4A342E", fontWeight: "bold" },
  dayTabTextActive: { color: "#FFF" },
  separatorLine: { width: "100%", height: 15, resizeMode: "contain" },

  mainHorizontalScroll: { flex: 1 },
  pageContainer: { width: SCREEN_WIDTH, flex: 1 },
  timelineScroll: { flex: 1 },
  timelineWrapper: { paddingTop: 10, position: "relative", minHeight: 300 },
  verticalLine: {
    position: "absolute",
    left: 7.5,
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
    justifyContent: "space-between",
    marginTop: 10,
  },
  tinyCreatorAvatarContainer: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    overflow: "hidden",
    backgroundColor: "#FFF",
    marginLeft: 10,
  },
  tinyCreatorAvatar: { width: "100%", height: "100%" },
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
    shadowColor: "#5E433B",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
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
    fontSize: 16,
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
    marginTop: 14,
    marginBottom: 6,
  },
  timePickerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  pixelTimeBox: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 10,
    alignItems: "center",
  },
  activeTimeBox: { backgroundColor: "#F4D03F" },
  pixelTimeText: { fontWeight: "bold" },
  timeTilde: { fontSize: 18 },
  timePickerWrapper: { width: "100%" },
  inlinePickerContainer: {
    backgroundColor: "#F4F0E8",
    borderWidth: 2,
    borderColor: "#5E433B",
    width: "100%",
    justifyContent: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    paddingBottom: 10,
  },
  dateTimePicker: {
    width: "100%",
    height: 200,
  },
  pixelInput: {
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 12,
    color: "#4A342E",
  },
  pixelTextArea: { height: 90, textAlignVertical: "top" },
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
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 12,
  },
  customDropdownText: { color: "#8D6E63", fontSize: 14 },
  customDropdownList: {
    width: "100%",
    backgroundColor: "#FFF",
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
  customDropdownItemText: { color: "#8D6E63", fontSize: 14 },
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

  // 🌟 全螢幕滿版推到底背景（完全與設計稿一體化）
  fullPageModalContainer: {
    flex: 1,
    backgroundColor: "#F5EFE6",
  },
  modalPageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 10 : 20,
    paddingBottom: 5,
  },
  modalPageBtnRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 28,
    paddingBottom: 10,
  },
  pageCustomBtn: {
    borderWidth: 2,
    borderColor: "#4A342E",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pageCancelBtn: { backgroundColor: "#C2EABD" },
  pageSaveBtn: { backgroundColor: "#EC7424" },
  pageCancelBtnText: {
    fontFamily: "PressStart2P",
    fontSize: 14,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
 pageSaveBtnText: {
    fontFamily: "PressStart2P",
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  pageBtnShadow: {
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  pageBtnPressed: {
    transform: [{ translateY: 2 }, { translateX: 2 }],
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  halfPageModalContainer: {
    width: "100%",
    backgroundColor: "#F5EFE6",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: "#4A342E",
    paddingTop: 10,
  },

  // 🌟 完美復刻 image_fef663.png 設計稿的大寬型相片方框樣式
  designAddImageFrame: {
    width: "100%",
    height: 110, // 精準重現大框框比例
    borderWidth: 2,
    borderColor: "#5E433B",
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  designAddImageFrameText: {
    fontSize: 14,
    color: "#8D6E63",
    fontWeight: "500",
  },
  // 當裡面加了相片時的滾動外框
  designAddImageFrameActive: {
    width: "100%",
    height: 110,
    borderWidth: 2,
    borderColor: "#5E433B",
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  designPreviewImage: {
    width: 85,
    height: 85,
    borderWidth: 2,
    borderColor: "#4A342E",
  },
  // 迷你追加相片按鈕
  designMiniAddBtn: {
    width: 50,
    height: 85,
    borderWidth: 2,
    borderColor: "#5E433B",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FDFBF0",
  },
});