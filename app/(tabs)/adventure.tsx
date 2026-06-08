//模組
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebaseConfig";

import { COLORS, texts } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useFocusEffect, useGlobalSearchParams } from "expo-router";
import { Plus, X } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
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
  UIManager,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

//角色圖對照
const CHARACTER_MAP: Record<string, any> = {
  bear: require("../../character/character_bear.gif"),
  cat: require("../../character/character_cat.gif"),
};

function getCharacterSource(characterId: string | null | undefined) {
  if (!characterId) return null;
  const key = String(characterId).trim();
  return CHARACTER_MAP[key] ?? null;
}
const { width: SCREEN_WIDTH } = Dimensions.get("window");

//行程卡片
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
// 🌟 開啟 Android 的 LayoutAnimation 支援
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
export default function AdventureScreen() {
  //宣告畫面變數
  const params = useGlobalSearchParams();
  const [id, setId] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  // 1. 新增編輯模式狀態
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  // 2. 更新 Firestore 的函式
  const handleUpdateName = async () => {
    if (!id || tempName.trim() === "" || tempName === name) {
      setIsEditingName(false);
      return;
    }
    try {
      const docRef = doc(db, "adventures", id);
      await updateDoc(docRef, { name: tempName });
      setName(tempName); // 更新畫面顯示
      setIsEditingName(false);
    } catch (error) {
      Alert.alert("錯誤", "無法更新名稱");
    }
  };
  // 🌟 2. 智能參數攔截器：網址有帶就存進手機，網址遺失就從手機撈回來救命！
  useEffect(() => {
    const rescueParams = async () => {
      if (params.id) {
        // 正常進入：記住參數並寫入保險箱
        setId(params.id as string);
        setName(params.name as string);
        await AsyncStorage.setItem("@current_adventure_id", params.id as string);
        if (params.name) await AsyncStorage.setItem("@current_adventure_name", params.name as string);
      } else {
        // 從 Setup 回來（網址參數消失了）：從保險箱拿出來用！
        const storedId = await AsyncStorage.getItem("@current_adventure_id");
        const storedName = await AsyncStorage.getItem("@current_adventure_name");
        if (storedId) setId(storedId);
        if (storedName) setName(storedName);
      }
    };
    rescueParams();
  }, [params.id, params.name]);

  //UI狀態
  const [currentDay, setCurrentDay] = useState(1);

  const [totalDays, setTotalDays] = useState(1);
  const [adventureDates, setAdventureDates] = useState({ start: "", end: "" });
  const [items, setItems] = useState<TimelineItemType[]>([]);
  const [loading, setLoading] = useState(true);
  // 🌟 自動計算動態寬度魔法
  // 假設兩邊邊距是 20，按鈕間距是 10 (配合你原本的 styles.dayScrollContent)
  const PADDING_HORIZONTAL = 20;
  const TAB_GAP = 10;

  // 如果天數 <= 4，就用實際天數平分；如果 > 4，就固定用 4 等份的寬度
  const visibleCount = Math.min(totalDays, 4);

  // 算出每顆按鈕最完美的寬度
  const dynamicTabWidth = (SCREEN_WIDTH - (PADDING_HORIZONTAL * 2) - (TAB_GAP * (visibleCount - 1))) / visibleCount;
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
  // 🔴 1. 新增這個：用來強迫 useEffect 重新執行的觸發器
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // 🔴 2. 新增這個：每次畫面出現時都會被執行的 Hook
  useFocusEffect(
    useCallback(() => {
      // 確保每次回到這頁，都立刻抓取最新的本機資料
      AsyncStorage.getItem("@user_profile").then((str) => {
        if (str) setMyProfile(JSON.parse(str));
      });
      // 改變數值，強制底下的 useEffect 重新去 Firebase 撈大家的最新頭像
      setRefreshTrigger((prev) => prev + 1);
    }, [])
  );
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

  //監聽rebase監聽+資料計算
  useEffect(() => {
    if (!id) return;

    AsyncStorage.setItem("@current_adventure_id", id as string).catch((err) =>
      console.error("儲存冒險 ID 失敗:", err),
    );



    const unsubRoom = onSnapshot(
      doc(db, "adventures", id as string),
      async (docSnap) => { // 👈 記得這裡要加 async
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRoomMembers(data.members || []);
          // 🔴 關鍵修復：像隊伍頁面一樣，去 users 表抓最新的頭像資料
          const rawMembers = data.members || [];
          const enriched = await Promise.all(
            rawMembers.map(async (m: any) => {
              const memberUid = typeof m === "string" ? m : m.uid;
              if (!memberUid) return m;
              try {
                const userSnap = await getDoc(doc(db, "users", memberUid));
                if (userSnap.exists()) {
                  const u = userSnap.data();
                  return {
                    ...(typeof m === "object" ? m : { uid: memberUid }),
                    uid: memberUid,
                    name: u.displayName || u.name || "冒險者",
                    characterId: u.characterId || u.avatar || null, // 抓取最新的角色 ID
                  };
                }
              } catch (e) {
                console.warn("抓取行程成員資料失敗:", e);
              }
              return typeof m === "object" ? m : { uid: memberUid };
            })
          );
          setRoomMembers(enriched);
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
  }, [id, refreshTrigger]);
  //滑動頁面事件
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
  //點擊DAY事件
  const handleDayTabPress = (dayIndex: number) => {
    setCurrentDay(dayIndex);
    horizontalScrollRef.current?.scrollTo({
      x: (dayIndex - 1) * SCREEN_WIDTH,
      animated: true,
    });
  };
  //關閉新增/編輯行程視窗
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
  //儲存行程事件
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
  //儲存行程到 Firebase
  const handleSaveItem = async (
    newItemData: Omit<TimelineItemType, "id" | "createdBy" | "day">,
  ) => {
    // 防呆 1：確保 ID 有救回來
    if (!id) {
      Alert.alert("連線錯誤", "遺失冒險資料，請退回首頁重新進入！");
      return;
    }

    // 🔴 終極殺手鐧：直接從 Firebase Auth 抓取現在登入者的 UID，不再依賴 AsyncStorage！
    const currentUid = auth.currentUser?.uid || myProfile?.uid;

    // 防呆 2：雙重確認都抓不到再擋
    if (!currentUid) {
      Alert.alert("錯誤", "系統抓不到你的登入狀態，請重啟 App！");
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
          createdBy: currentUid, // 👈 🌟 使用剛剛抓到的真實 UID 寫入行程
        });
      }
    } catch (error) {
      console.error("行程儲存失敗:", error);
      Alert.alert("錯誤", "無法同步行程到雲端");
    }
  };

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  // 刪除行程的觸發函式
  const handleDeleteTask = (itemId: string) => {
    setDeleteTargetId(itemId);
    setIsDeleteModalVisible(true);
  };
  // 確認刪除的函式
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
        <TouchableOpacity style={{ height: 32, width: 32 }} onPress={() => router.replace("/home")}>
          <Image
            source={require("../../img/icon_chevronLeft.png")}
            style={{ height: 20, aspectRatio: 1 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          {isEditingName ? (
            // 編輯狀態：顯示輸入框
            <TextInput
              style={[styles.pixelTitleInput, { fontSize: 16, padding: 0 }]}
              value={tempName}
              onChangeText={setTempName}
              onBlur={handleUpdateName} // 點擊外面自動儲存
              onEndEditing={handleUpdateName} // 按下鍵盤完成自動儲存
              autoFocus
              placeholder="請輸入名稱"
              placeholderTextColor={COLORS.line2}
            />
          ) : (
            // 顯示狀態：可點擊觸發編輯
            <TouchableOpacity
              onPress={() => {
                setTempName(name || "");
                setIsEditingName(true);
              }}
              style={{ alignItems: 'center' }}
            >
              <Text style={texts.title2}>
                {renderPixelText(name ? name.toString().toUpperCase() : "MY ADVENTURE")}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={[texts.subtitle, { marginTop: 5 }]}>
            {`${formatShortDate(adventureDates.start)}~${formatShortDate(adventureDates.end)}`}
          </Text>
        </View>

        <TouchableOpacity style={{ height: 32, width: 32 }}
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
            style={{ height: 24, aspectRatio: 1 }}
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
            <Pressable
              key={index + 1}
              onPress={() => handleDayTabPress(index + 1)}
            >
              {({ pressed }) => (
                <View
                  style={[
                    styles.dayTab,
                    { width: dynamicTabWidth }, // 👈 🌟 加上這行！它會覆蓋原本的寬度設定
                    currentDay === index + 1 && styles.dayTabActive,
                    pressed ? styles.dayTabPressed : styles.dayTabShadow,
                  ]}
                >
                  <Text style={[texts.title2, currentDay === index + 1 && { color: "#FFF" }]}>
                    {renderPixelText(`DAY${index + 1}`)}
                  </Text>
                </View>
              )}
            </Pressable>
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
                      // 🔴 1. 刪除原本抓取頭像的變數，換成判斷「是不是我建立的」
                      const currentUid = auth.currentUser?.uid || myProfile?.uid;
                      const isCreator = item.createdBy === currentUid;

                      return (
                        <View key={item.id} style={styles.timelineRow}>
                          <View style={styles.timelineDot} />

                          {/* 點擊字卡編輯 */}
                          <Pressable
                            style={{ flex: 1 }}
                            delayLongPress={600}
                            onLongPress={() => {
                              if (!isCreator) return; // 👈 直接用 isCreator 判斷
                              handleDeleteTask(item.id);
                            }}
                            onPress={() => {
                              if (!isCreator) return; // 👈 直接用 isCreator 判斷

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
                              <View
                                style={[
                                  styles.card,
                                  // 🌟 判斷按下狀態：沒按顯示 Shadow，按下去顯示 Pressed
                                  pressed ? styles.cardPressed : styles.cardShadow
                                ]}
                              >
                                {/* ... 以下內容不變 (cardHeader, cardTitle...) */}
                                <View style={styles.cardHeader}>
                                  <Text style={styles.cardTime}>{item.time}</Text>
                                  <View style={styles.cardActions}>
                                    {isCreator && (
                                      <Image
                                        source={require("../../img/icon_edit.png")}
                                        style={{ width: 16, height: 16, tintColor: "#8D6E63" }}
                                        resizeMode="contain"
                                      />
                                    )}
                                  </View>
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

                                  {/* 🔴 3. 最右邊的 <View style={styles.tinyCreatorAvatarContainer}>... 已經被整塊刪除！ */}
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
      <Pressable
        onPress={openAddModal}
        style={({ pressed }) => [
          styles.fab, // 保留原本的 FAB 圓形外框設定
          pressed && { transform: [{ translateY: 2 }] }, // 按下時微微下移一點點
        ]}
      >
        {({ pressed }) => (
          <View>
            {/* 預設狀態的圖片 */}
            <Image
              source={require("../../img/button_plus.png")}
              style={[styles.fabIcon, { opacity: pressed ? 0 : 1 }]}
            />
            {/* 按下狀態的圖片 (絕對定位疊在上面) */}
            <Image
              source={require("../../img/button_plus_pressed.png")}
              style={[styles.fabIcon, styles.fabIconAbsolute, { opacity: pressed ? 1 : 0 }]}
            />
          </View>
        )}
      </Pressable>
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
            {/* 1. 頂部列：返回按鈕 (獨立一排，整排寬度皆可點擊) */}
            <TouchableOpacity
              onPress={closeModal}
              style={{ width: "100%", paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 10 : 20, paddingBottom: 15 }}
            >
              <Image source={require("../../img/icon_chevronLeft.png")} style={{ height: 16, width: 16 }} resizeMode="contain" />
            </TouchableOpacity>

            {/* 2. 中間列：文字輸入框與編輯 Icon */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingBottom: 8, width: "100%", position: "relative" }}>
              {/* 文字置中 */}
              <TextInput
                style={[styles.pixelTitleInputCH, { padding: 0 }]}
                placeholder="請在此輸入目的地"
                placeholderTextColor="#8D6E63"
                value={taskTitle}
                onChangeText={setTaskTitle}
                autoFocus={isModalVisible} // 自動跳出鍵盤
              />
              {/* 編輯 Icon 靠右絕對定位，這樣才不會把文字往左邊擠 */}
              <Image
                source={require("../../img/icon_edit.png")}
                style={{ height: 16, width: 16, position: "absolute", right: 20, bottom: 10 }}
                resizeMode="contain"
              />
            </View>

            {/* 3. 底部列：波浪底線 (左右距離邊界 20) */}
            <View style={{ paddingHorizontal: 20, width: "100%", marginBottom: 15 }}>
              <Image source={require("../../img/ad_line.png")} style={{ width: "100%", height: 10, resizeMode: "contain" }} />
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, gap: 10 }}
            >
              {/* 時間區塊 */}
              <Text style={texts.subtitle2}>時間</Text>
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
                      // 🔴 關鍵修改：拔掉 Platform 判斷，直接強制兩邊都使用 "spinner"
                      display="spinner"
                      is24Hour={false}
                      locale="zh_TW"
                      textColor="#4A342E"
                      onChange={(e, d) => {
                        // Android 選完時間後會自動關閉彈出視窗，所以這裡把狀態設為 false 是正確的
                        if (Platform.OS === "android") {
                          setShowStartPicker(false);
                          setShowEndPicker(false);
                        }
                        if (d) showStartPicker ? setStartTime(d) : setEndTime(d);
                      }}
                    />

                    {/* 這裡維持只給 iOS 顯示「完成」按鈕，因為 Android 的彈出視窗自帶「確定/取消」了 */}
                    {Platform.OS === "ios" && (
                      <TouchableOpacity style={{ alignSelf: "center", marginBottom: 10 }} onPress={() => { setShowStartPicker(false); setShowEndPicker(false); }}>
                        <Text style={{ color: "#EC7424", fontWeight: "bold" }}>完成</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* 地址區塊 */}
              <Text style={texts.subtitle2}>地址</Text>
              <TextInput style={styles.pixelInput} placeholder="請輸入地址" placeholderTextColor="#8D6E63" value={taskLocation} onChangeText={setTaskLocation} />

              {/* 類型區塊 */}
              <Text style={texts.subtitle2}>類型</Text>
              <View style={{ position: "relative", zIndex: 10 }}>

                <TouchableOpacity
                  // 🔴 1. 拿掉 showTypePicker 時隱藏底線的設定，讓底線永遠保持存在！
                  style={styles.customDropdownHeader}
                  onPress={() => {
                    // 🌟 加入展開/收合的動畫過渡效果
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowTypePicker(!showTypePicker);
                  }}
                >
                  <Text style={[styles.customDropdownText, taskType ? { color: "#4A342E", fontWeight: "bold" } : {}]}>
                    {taskType === "spot" ? "景點" : taskType === "food" ? "美食" : taskType === "shopping" ? "購物" : "請選擇行程類型"}
                  </Text>

                  {/* 🔴 2. 右側的 Icon：如果有選擇類型，就變身成對應的圖示；沒有就顯示向下的箭頭 */}
                  <Image
                    source={
                      taskType === "spot" ? require("../../img/icon_star.png") :
                        taskType === "food" ? require("../../img/icon_food.png") :
                          taskType === "shopping" ? require("../../img/icon_shopping.png") :
                            require("../../img/icon_chevronDown.png")
                    }
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
                          // 🌟 點擊選項收起時，一樣加入動畫過渡效果
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setTaskType(type);
                          setShowTypePicker(false);
                        }}
                      >
                        <Text style={styles.customDropdownItemText}>
                          {type === "spot" ? "景點" : type === "food" ? "美食" : "購物"}
                        </Text>
                        <Image
                          source={
                            type === "spot" ? require("../../img/icon_star.png") :
                              type === "food" ? require("../../img/icon_food.png") :
                                require("../../img/icon_shopping.png")
                          }
                          style={styles.dropdownIcon}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* 備註區塊 */}
              <Text style={texts.subtitle2}>備註</Text>
              <TextInput style={[styles.pixelInput, styles.pixelTextArea]} multiline placeholder="請輸入備註...(交通、編輯者等等)" placeholderTextColor="#8D6E63" value={taskDesc} onChangeText={setTaskDesc} />

              {/* 🌟 完美復刻 image_fef663.png 寬型大圖片方框 */}
              <Text style={texts.subtitle2}>圖片</Text>
              {modalImageUris.length === 0 ? (
                // 狀況 A：還沒有照片時，秀出設計稿原本的「點此上傳圖片+」大格子
                <TouchableOpacity style={styles.designAddImageFrame} onPress={pickImagesForModal}>
                  <Text style={texts.subtitle}>點此上傳圖片+</Text>
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
                      <Text style={styles.pageCancelBtnText}>save</Text>
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
            <Text style={[styles.pixelTitleInput, { fontSize: 18 }]}>DELETE?</Text>
            <Text style={{ color: "#8D6E63",  fontWeight: "bold" }}>刪除後此行程無法復原！</Text>
            {/* 底部按鈕列：cancel & save */}
            <View style={styles.modalPageBtnRow}>
              <Pressable style={{ flex: 1 }} onPress={() => setIsDeleteModalVisible(false)}>
                {({ pressed }) => (
                  <View style={[styles.pageCustomBtn, styles.pageCancelBtn, pressed ? styles.pageBtnPressed : styles.pageBtnShadow]}>
                    <Text style={styles.pageCancelBtnText}>cancel</Text>
                  </View>
                )}
              </Pressable>

              <Pressable style={{ flex: 1 }} onPress={confirmDelete}>
                {({ pressed }) => (
                  <View style={[styles.pageCustomBtn, styles.pageSaveBtn, pressed ? styles.pageBtnPressed : styles.pageBtnShadow]}>
                    <Text style={styles.pageCancelBtnText}>OK</Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
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
  headerTitle: { flexDirection: "row", alignItems: "center", color: COLORS.line, fontSize: 12, },
  headerDate: { fontSize: 14, color: COLORS.line2 },
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

  // 🌟 1. 未按下時的狀態：加厚右邊跟下方的邊框，營造出立體的實體陰影感
  dayTabShadow: {
    borderRightWidth: 2,
    borderBottomWidth: 4,
  },

  // 🌟 2. 按下時的狀態：按鈕往右下角推移，同時邊框變回一般的 2，產生被「壓扁」的錯覺
  dayTabPressed: {
    transform: [{ translateY: 2 }],
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  dayTabActive: { backgroundColor: COLORS.line2 },
  dayTabText: { fontSize: 12, color: "#4A342E", fontWeight: "bold" },
  dayTabTextActive: { color: "#FFF" },
  separatorLine: { width: "100%", height: 10, resizeMode: "contain" },

  mainHorizontalScroll: { flex: 1 },
  pageContainer: { width: SCREEN_WIDTH, flex: 1 },
  timelineScroll: { flex: 1 },
  timelineWrapper: { paddingTop: 10, position: "relative", minHeight: 300 },
  verticalLine: {
    position: "absolute",
    left: 5,
    top: -10,
    bottom: 0,
    width: 6,
    backgroundColor: COLORS.disable,
  },
  timelineRow: { flexDirection: "row", marginBottom: 1 },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#4A342E",
    marginTop: 20,
    marginRight: 15,
    zIndex: 2,
  },
  card: {
    flex: 1,
    backgroundColor: "#FFF",
    // 1. 將四邊邊框拆開，為了做出「右下角比較粗」的陰影感
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 15,
    marginBottom: 20,
  },

  // 🌟 靜態時的陰影效果 (底邊寬度4，右邊寬度2)
  cardShadow: {
    borderBottomWidth: 4,
    borderRightWidth: 2,
  },

  // 🌟 按下時的效果：往 Y 軸移動 2，且右下邊框變薄，產生「陷入」感
  cardPressed: {
    transform: [{ translateY: 2 }],
    borderBottomWidth: 4,
    borderRightWidth: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  cardTime: { fontSize: 13, color: "#8D6E63", fontWeight: "bold" },
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
    fontWeight: "bold",
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
  },
  // 讓圖片置中在 FAB 裡
  fabIcon: {
    width: 60,
    height: 60,
    resizeMode: "contain",
  },
  // 絕對定位讓圖片重疊
  fabIconAbsolute: {
    position: "absolute",
    top: -2,
    left: 0,
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
    fontFamily: "PressStart2P",
    fontSize: 16,
    color: "#5E433B",
    textAlign: "center",
    padding: 10,
  },
  pixelTitleInputCH: {
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
    fontWeight: "bold",
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
  customDropdownText: { color: "#8D6E63", fontSize: 14, fontWeight: "bold", },
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
  customDropdownItemText: { color: "#8D6E63", fontSize: 14, fontWeight: "bold" },
  dropdownIcon: { width: 20, height: 20, resizeMode: "contain" },
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
  pageCancelBtn: { backgroundColor: COLORS.disable },
  pageSaveBtn: { backgroundColor: COLORS.primary },
  pageCancelBtnText: {
    fontFamily: "PressStart2P",
    fontSize: 14,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
 
  pageBtnShadow: {
    borderRightWidth: 2,
    borderBottomWidth: 4,
  },
  pageBtnPressed: {
    transform: [{ translateY: 2 },],
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
  caret: { width: 30, height: 30, resizeMode: "contain" },
  caret_absolute: { position: "absolute", top: 0, left: 0 },
});