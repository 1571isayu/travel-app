import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

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

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    return parts.length === 3 ? `${parts[1]}.${parts[2]}` : dateStr;
  };

  // 1. 初始化：請求權限 + 讀取行程基本資料
  useEffect(() => {
    const fetchAdventureData = async () => {
      // 在 map.tsx 的第一個 useEffect 內加入
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("權限不足", "請允許存取位置以解析行程地點");
        return;
      }
      try {
        setLoading(true);
        console.log("🔍 開始讀取資料，收到的 ID 為:", id);

        const savedAdventures = await AsyncStorage.getItem("@my_adventures_v2");
        if (!savedAdventures) {
          console.log("❌ 找不到任何行程設定檔 (@my_adventures_v2)");
          setLoading(false);
          return;
        }

        const adventures = JSON.parse(savedAdventures);
        const targetId =
          id ||
          (adventures.length > 0 ? adventures[adventures.length - 1].id : null);

        if (!targetId) {
          console.log("❌ 沒有行程 ID，也找不到預設行程");
          setLoading(false);
          return;
        }

        console.log("✅ 確定目標行程 ID:", targetId);

        const currentAdv = adventures.find((adv: any) => adv.id === targetId);
        if (currentAdv) {
          setAdventureDates({
            start: currentAdv.startDate,
            end: currentAdv.endDate,
          });
          const start = new Date(currentAdv.startDate);
          const end = new Date(currentAdv.endDate);
          const diffDays =
            Math.ceil(
              Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
            ) + 1;
          setTotalDays(diffDays);
        }

        const savedTimeline = await AsyncStorage.getItem(
          `@timeline_${targetId}`,
        );
        if (savedTimeline) {
          const parsedTimeline = JSON.parse(savedTimeline);
          console.log("📍 抓到的行程項目數量:", parsedTimeline.length);
          setItems(parsedTimeline);
        } else {
          console.log("⚠️ 該行程目前沒有任何地點資料");
        }
      } catch (error) {
        console.error("🚨 讀取過程中發生錯誤:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdventureData();
  }, [id]);

  // 2. 當天數或資料改變時，轉換地址為座標
  useEffect(() => {
    const geocodeLocations = async () => {
      //程式會先掃描當天的所有行程點（items）
      //並找出那些有填寫 location 欄位的項目
      setGeocoding(true);
      const dayItems = items
        .filter(
          (i) => i.day === currentDay && i.location && i.location.trim() !== "",
        )
        .sort((a, b) => a.time.localeCompare(b.time));

      const newCoords: CoordinateType[] = [];

      for (const item of dayItems) {
        try {
          //呼叫 Expo Location API
          const geocoded = await Location.geocodeAsync(item.location!);
          if (geocoded.length > 0) {
            newCoords.push({
              //把標題 時間打包
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
            //自動調整縮放以包含所有座標
            edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
            animated: true,
          });
        }, 600);
      }
    };

    if (items.length > 0) geocodeLocations();
  }, [currentDay, items]);

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
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft color="#4A342E" size={28} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {name ? name.toString().toUpperCase() : "MAP VIEW"}
          </Text>
          <Text style={styles.headerDate}>
            {`${formatShortDate(adventureDates.start)}~${formatShortDate(adventureDates.end)}`}
          </Text>
        </View>

        {/* 🌟 舊的漢堡選單已刪除，改用一個隱形的空 View 佔位，確保中間的標題不歪掉 🌟 */}
        <View style={{ width: 28 }} />
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

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          showsUserLocation={true} // 🌟 必須為 true
          showsMyLocationButton={true} // 🌟 建議加上，會出現一個按鈕讓你一鍵回到自己位置
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
              strokeColor="#5E433B" // 🌟 連線顏色統一改回深褐色，搭配地圖更有質感
              strokeWidth={4} // 加粗一點讓路線更明顯
              lineDashPattern={[0, 0]}
            />
          )}

          {coordinates.map((coord, index) => (
            <Marker
              key={index}
              coordinate={{
                latitude: coord.latitude,
                longitude: coord.longitude,
              }}
              title={coord.title}
              description={coord.time}
            >
              {/* 🌟 客製化帶數字的 Marker */}
              <View style={styles.customMarker}>
                <Text style={styles.markerText}>{index + 1}</Text>
              </View>
              {/* 下方的小三角形，營造地標針的感覺 */}
              <View style={styles.markerTriangle} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFDF9" },
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
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: "#5E433B",
    backgroundColor: "#FFFDF9",
  },
  dayTabActive: { backgroundColor: "#5E433B" },
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

  // 🌟 客製化 Marker 的樣式
  customMarker: {
    backgroundColor: "#EC7424", // 統一使用橘色
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20, // 圓角外觀
    borderWidth: 2,
    borderColor: "#FFFDF9", // 白色邊框增加對比度
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4, // Android 陰影
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
    borderTopColor: "#EC7424", // 顏色跟上面的底色一樣
    alignSelf: "center",
  },
});
