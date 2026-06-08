import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import { COLORS, texts } from "@/constants/theme";
// 🌟 引入 Firebase 與即時監聽工具
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
type TimelineItemType = {
  id: string;
  day: number;
  time: string;
  title: string;
  location?: string;
};

type CoordinateType = {
  latitude: number;
  longitude: number;
  title: string;
  time: string;
};

export default function MapScreen() {
  const { id, name } = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);

  const [currentDay, setCurrentDay] = useState(1);
  const [totalDays, setTotalDays] = useState(1);
  const [adventureDates, setAdventureDates] = useState({ start: "", end: "" });
  const [items, setItems] = useState<TimelineItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [coordinates, setCoordinates] = useState<CoordinateType[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  // 🌟 1. 補上 DayTab 的 Ref
  const dayTabScrollRef = useRef<ScrollView>(null);

  // 🌟 2. 補上動態寬度計算 (複製自 AdventureScreen)
  const PADDING_HORIZONTAL = 20;
  const TAB_GAP = 10;
  const visibleCount = Math.min(totalDays, 4);
  const dynamicTabWidth = (SCREEN_WIDTH - (PADDING_HORIZONTAL * 2) - (TAB_GAP * (visibleCount - 1))) / visibleCount;

  // 🌟 3. 點擊 Day 事件 (加入動畫與捲動邏輯)
  const handleDayTabPress = (dayIndex: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentDay(dayIndex);
    dayTabScrollRef.current?.scrollTo({
      x: (dayIndex - 1) * (dynamicTabWidth + TAB_GAP),
      animated: true,
    });
  };
  // 導航到 Google Maps 的輔助函數
  const openInGoogleMaps = (lat: number, lng: number, title: string) => {
    const url = Platform.select({
      ios: `comgooglemaps://?q=${lat},${lng}&center=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
    });

    Linking.canOpenURL(url!).then((supported) => {
      if (supported) {
        Linking.openURL(url!);
      } else {
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(webUrl);
      }
    });
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
  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    return parts.length === 3 ? `${parts[1]}.${parts[2]}` : dateStr;
  };

  useEffect(() => {
    if (!id) return;

    let unsubRoom: () => void;
    let unsubItinerary: () => void;

    const requestPermissionAndListen = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("權限不足", "請允許存取位置以解析行程地點");
        setLoading(false);
        return;
      }

      try {
        unsubRoom = onSnapshot(
          doc(db, "adventures", id as string),
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.startDate && data.endDate) {
                setAdventureDates({ start: data.startDate, end: data.endDate });
                const start = new Date(data.startDate);
                const end = new Date(data.endDate);
                const diffDays =
                  Math.ceil(
                    Math.abs(end.getTime() - start.getTime()) /
                    (1000 * 60 * 60 * 24),
                  ) + 1;
                setTotalDays(diffDays);
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

        unsubItinerary = onSnapshot(q, (snapshot) => {
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
      } catch (error) {
        console.error("🚨 讀取地圖資料發生錯誤:", error);
        setLoading(false);
      }
    };

    requestPermissionAndListen();

    return () => {
      if (unsubRoom) unsubRoom();
      if (unsubItinerary) unsubItinerary();
    };
  }, [id]);

  useEffect(() => {
    const geocodeLocations = async () => {
      setGeocoding(true);
      const dayItems = items
        .filter(
          (i) => i.day === currentDay && i.location && i.location.trim() !== "",
        )
        .sort((a, b) => a.time.localeCompare(b.time));

      const newCoords: CoordinateType[] = [];

      for (const item of dayItems) {
        try {
          const geocoded = await Location.geocodeAsync(item.location!);
          if (geocoded.length > 0) {
            newCoords.push({
              latitude: geocoded[0].latitude,
              longitude: geocoded[0].longitude,
              title: item.title,
              time: item.time,
            });
          }
        } catch (err) {
          console.warn(`地址無法解析: ${item.location}`);
        }
      }

      setCoordinates(newCoords);
      setGeocoding(false);

      if (newCoords.length > 0 && mapRef.current) {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(newCoords, {
            edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
            animated: true,
          });
        }, 600);
      }
    };

    if (items.length > 0) {
      geocodeLocations();
    } else if (items.length === 0 && !loading) {
      setCoordinates([]);
    }
  }, [currentDay, items, loading]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#4A342E" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          <Text style={texts.title2}>
            {renderPixelText(name ? name.toString().toUpperCase() : "MY ADVENTURE")}
          </Text>
          <Text style={[texts.subtitle, { marginTop: 5 }]}>
            {`${formatShortDate(adventureDates.start)}~${formatShortDate(adventureDates.end)}`}
          </Text>
        </View>

        <TouchableOpacity style={{ height: 32, width: 32 }}
          onPress={() => {
            if (id) {
              router.push({ pathname: "/adventure", params: { id, name } });
            } else {
              Alert.alert("提示", "找不到行程 ID，無法開啟地圖");
            }
          }}
        >
          <Image
            source={require("../../img/icon_calendar.png")}
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
                    { width: dynamicTabWidth }, // 👈 動態寬度
                    currentDay === index + 1 && styles.dayTabActive,
                    pressed ? styles.dayTabPressed : styles.dayTabShadow,
                  ]}
                >
                  <Text style={[texts.title2, currentDay === index + 1 && styles.dayTabTextActive]}>
                    {renderPixelText(`DAY${index + 1}`)}
                  </Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Image
        source={require("../../img/ad_line.png")}
        style={styles.separatorLine}
      />

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          showsUserLocation={true}
          showsMyLocationButton={true}
          initialRegion={{
            latitude: 23.6978,
            longitude: 120.9605,
            latitudeDelta: 5,
            longitudeDelta: 5,
          }}
        >
          {coordinates.length > 1 && (
            <Polyline
              coordinates={coordinates}
              strokeColor="#5E433B"
              strokeWidth={4}
              lineDashPattern={[10, 6]}
            />
          )}

          {coordinates.map((coord, index) => (
            <Marker
              key={index}
              coordinate={{
                latitude: coord.latitude,
                longitude: coord.longitude,
              }}
              title={coord.title} // Android 點擊會顯示這個名稱
              description={coord.time}
              // 🌟 1. 判斷平台：iOS 保持跳轉，Android 設為 undefined (只會彈出內建的名稱小視窗)
              onPress={
                Platform.OS === "ios"
                  ? () => openInGoogleMaps(coord.latitude, coord.longitude, coord.title)
                  : undefined
              }
            >
              {/* 🌟 2. 使用 ImageBackground 當作底圖，確保 Android 不會切圖 */}
              <ImageBackground
                source={require("../../img/icon_mapMarker.png")} // 你的地標圖檔
                style={{
                  width: 36,
                  height: 36,
                  justifyContent: 'center', // 讓裡面的文字垂直置中
                  alignItems: 'center'      // 讓裡面的文字水平置中
                }}
                resizeMode="contain"
              >
                {/* 🌟 3. 疊在背景圖上的動態數字 */}
                <Text style={{
                  color: "#FFFDF9", 
                  fontSize: 12,
                  fontFamily: "PressStart2P", // 使用像素字體
                  // 如果你的 marker 圖檔下面有尖尖的尾巴，導致數字看起來偏下
                  // 可以加上 marginBottom 把數字往上推，例如：
                  marginBottom: 4,
                }}>
                  {index + 1}
                </Text>
              </ImageBackground>
            </Marker>
          ))}
        </MapView>

        {geocoding && (
          <View style={styles.mapOverlay}>
            <ActivityIndicator color="#5E433B" size="large" />
            <Text style={{ marginTop: 10, color: "#5E433B" }}>
              解析地址中...
            </Text>
          </View>
        )}

        {coordinates.length === 0 && !geocoding && (
          <View style={styles.emptyNotice}>
            <Text style={styles.emptyText}>這天沒有可顯示的地址喔！</Text>
          </View>
        )}
      </View>
    </View >
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
  headerTitle: { fontSize: 16, color: "#5E433B", fontWeight: "bold" },
  headerDate: { fontSize: 14, color: "#8D6E63" },
  daySelectorContainer: { marginVertical: 10 },
  dayScrollContent: { paddingHorizontal: 20, gap: 10 },
  dayTab: {
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: "#5E433B",
    backgroundColor: "#FFFDF9",
    alignItems: "center",
    justifyContent: "center",
  },

  // 🌟 統一按壓樣式
  dayTabShadow: {
    borderRightWidth: 2,
    borderBottomWidth: 4,
  },
  dayTabPressed: {
    transform: [{ translateY: 2 }],
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },

  dayTabActive: { backgroundColor: COLORS.line2 },
  dayTabText: { fontSize: 12, color: "#5E433B", fontWeight: "bold" },
  dayTabTextActive: { color: "#FFFDF9" },

  separatorLine: {
    width: "100%",
    height: 15,
    resizeMode: "contain",
    marginBottom: 10,
  },
  mapContainer: {
    flex: 1,
    overflow: "hidden",
    borderTopWidth: 3,
    borderTopColor: "#5E433B",
  },
  map: { width: "100%", height: "100%" },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(253, 251, 240, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyNotice: {
    position: "absolute",
    top: 20,
    alignSelf: "center",
    backgroundColor: "#FFFDF9",
    padding: 10,
    borderWidth: 2,
    borderColor: "#5E433B",
    borderRadius: 20,
  },
  emptyText: { color: "#5E433B", fontWeight: "bold" },
  customMarker: {
    backgroundColor: "#EC7424",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFFDF9",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  markerText: {
    color: "#FFFDF9",
    fontWeight: "bold",
    fontSize: 14,
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#EC7424",
    alignSelf: "center",
  },
});