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

// 🌟 1. 引入 Firebase 與即時監聽工具
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../firebaseConfig"; // 如果報錯，請確認相對路徑是 "../firebaseConfig" 或 "../../firebaseConfig"

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

  // 🌟 2. 替換為 Firebase 即時監聽
  useEffect(() => {
    if (!id) return;

    let unsubRoom: () => void;
    let unsubItinerary: () => void;

    const requestPermissionAndListen = async () => {
      // 要求定位權限
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("權限不足", "請允許存取位置以解析行程地點");
        setLoading(false);
        return;
      }

      try {
        // A. 監聽房間基本資料（取得天數與日期）
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

        // B. 監聽行程資料（即時抓取所有地標）
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

    // 離開地圖時中斷連線，節省流量
    return () => {
      if (unsubRoom) unsubRoom();
      if (unsubItinerary) unsubItinerary();
    };
  }, [id]);

  // 3. 當天數或資料改變時，轉換地址為座標 (維持不變)
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
      setCoordinates([]); // 當天沒有行程時清空座標
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
              <View style={styles.customMarker}>
                <Text style={styles.markerText}>{index + 1}</Text>
              </View>
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
