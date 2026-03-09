import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { Edit3, Image as ImageIcon, List, Map as MapIcon, MapPin, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

type TimelineItemType = {
  id: string; day: number; type: string; time: string; title: string;
  desc?: string; location?: string; isPast: boolean; mapUrl?: boolean;
  picUrl?: string | null; lat?: number; lng?: number; 
};

export default function AdventureScreen() {
  const { name } = useLocalSearchParams(); 
  const adventureTitle = name || '未命名冒險';

  const [isReady, setIsReady] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [timeline, setTimeline] = useState<TimelineItemType[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  const [daysCount, setDaysCount] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [taskType, setTaskType] = useState('spot');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskLocation, setTaskLocation] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskImage, setTaskImage] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedData = await AsyncStorage.getItem(`@timeline_${adventureTitle}`);
        const savedDays = await AsyncStorage.getItem(`@days_${adventureTitle}`);
        if (savedData) setTimeline(JSON.parse(savedData));
        if (savedDays) setDaysCount(Number(savedDays));
      } catch (e) { console.error("讀取失敗", e); } 
      finally { setIsReady(true); }
    };
    loadData();
  }, [adventureTitle]);

  useEffect(() => {
    if (isReady) {
      AsyncStorage.setItem(`@timeline_${adventureTitle}`, JSON.stringify(timeline));
      AsyncStorage.setItem(`@days_${adventureTitle}`, daysCount.toString());
    }
  }, [timeline, daysCount, isReady, adventureTitle]);

  const formatTime = (date: Date) => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr: string) => {
    const [start, end] = timeStr.split(' - ');
    const parse = (t: string) => {
      const d = new Date();
      if(t) { const [h, m] = t.split(':'); d.setHours(Number(h), Number(m)); }
      return d;
    };
    return { s: parse(start), e: parse(end) };
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setTaskType('spot'); setTaskTitle(''); setTaskLocation(''); setTaskDesc(''); setTaskImage(null);
    setStartTime(new Date()); setEndTime(new Date()); setIsSaving(false);
    setShowStartPicker(false); setShowEndPicker(false);
  };

  const handleEdit = (item: TimelineItemType) => {
    setEditingId(item.id);
    setTaskType(item.type);
    setTaskTitle(item.title);
    setTaskLocation(item.location || '');
    setTaskDesc(item.desc || '');
    setTaskImage(item.picUrl || null);
    
    if (item.time) {
      const parsed = parseTime(item.time);
      setStartTime(parsed.s);
      setEndTime(parsed.e);
    }
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('確定刪除？', '刪掉就回不來囉！', [
      { text: '取消', style: 'cancel' },
      { text: '刪除', style: 'destructive', onPress: () => {
        setTimeline(timeline.filter(t => t.id !== id));
      }}
    ]);
  };

  const handleSaveTask = async () => {
    if (!taskTitle) return alert('請輸入標題！');
    setIsSaving(true);
    let newLat, newLng;

    if (taskLocation) {
      try {
        const geo = await Location.geocodeAsync(taskLocation);
        if (geo.length > 0) { newLat = geo[0].latitude; newLng = geo[0].longitude; }
      } catch (e) { console.log(e); }
    }

    const newTask: TimelineItemType = {
      id: editingId || Date.now().toString(),
      day: selectedDay,
      type: taskType, time: `${formatTime(startTime)} - ${formatTime(endTime)}`,
      title: taskTitle, location: taskLocation, desc: taskDesc,
      isPast: false, mapUrl: !!taskLocation, picUrl: taskImage, lat: newLat, lng: newLng,
    };

    if (editingId) {
      setTimeline(timeline.map(t => (t.id === editingId ? newTask : t)));
    } else {
      setTimeline([...timeline, newTask]);
    }
    handleCloseModal();
  };

  const currentDayTimeline = timeline.filter(item => item.day === selectedDay);

  const renderTimelineItem = (item: TimelineItemType) => (
    <View key={item.id} style={styles.itemWrapper}>
      <View style={item.type === 'warning' ? styles.dotWarning : item.type === 'transport' ? styles.dotTransport : styles.dotNormal} />
      <View style={[styles.card, item.type === 'warning' && styles.warningCard]}>
        
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10}}>
          <View style={styles.timeTag}>
            <Text style={styles.timeTagText}>🕒 {item.time}</Text>
          </View>
          
          <View style={{flexDirection: 'row', gap: 10}}>
            <TouchableOpacity onPress={() => handleEdit(item)}><Edit3 size={16} color="#8D6E63"/></TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)}><Trash2 size={16} color="#E84A41"/></TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.cardTitle, item.type === 'warning' && {color: '#E84A41'}]}>
          {item.type === 'food' ? '🍔 ' : item.type === 'transport' ? '🚆 ' : item.type === 'warning' ? '⚠️ ' : '⛩️ '}
          {item.title}
        </Text>
        
        <View style={styles.buttonRow}>
          {item.mapUrl && (
            <TouchableOpacity style={[styles.actionBtn, styles.btnMap]} onPress={() => location && Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location || '')}`)}>
              <MapPin size={12} color="#FFF" /><Text style={styles.btnText}>Map</Text>
            </TouchableOpacity>
          )}
          {item.picUrl && (
            <TouchableOpacity style={[styles.actionBtn, styles.btnPic]} onPress={() => setViewImage(item.picUrl || null)}>
              <ImageIcon size={12} color="#4A342E" /><Text style={styles.btnTextDark}>圖片</Text>
            </TouchableOpacity>
          )}
        </View>
        {item.desc ? <Text style={styles.cardDesc}>{item.desc}</Text> : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/home')} style={{marginRight: 10}}>
          <Text style={{fontSize: 20}}>🔙</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>🗺️ {adventureTitle}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.toggleButton} onPress={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}>
            {viewMode === 'list' ? <MapIcon size={16} color="#4A342E" /> : <List size={16} color="#4A342E" />}
            <Text style={styles.toggleButtonText}>{viewMode === 'list' ? '地圖' : '列表'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.addButtonText}>+新增</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.daysContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysScroll}>
          {Array.from({ length: daysCount }).map((_, i) => {
            const day = i + 1;
            return (
              <TouchableOpacity key={day} style={[styles.dayTab, selectedDay === day && styles.dayTabActive]} onPress={() => setSelectedDay(day)}>
                <Text style={[styles.dayTabText, selectedDay === day && styles.dayTabTextActive]}>Day {day}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.addDayBtn} onPress={() => setDaysCount(daysCount + 1)}>
            <Text style={styles.addDayText}>＋</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {viewMode === 'list' ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {currentDayTimeline.length === 0 ? (
             <View style={styles.emptyState}>
               <Text style={styles.emptyStateText}>這天還沒有行程喔！{'\n'}趕快按右上角新增吧！</Text>
             </View>
          ) : (
            <View style={styles.timelineContainer}>
              <View style={styles.verticalLine} />
              {currentDayTimeline.map(renderTimelineItem)}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.mapContainer}>
          <MapView style={styles.map} initialRegion={{latitude: 35.0, longitude: 135.76, latitudeDelta: 0.1, longitudeDelta: 0.1}}>
            {currentDayTimeline.filter(i => i.lat && i.lng).map(i => (
              <Marker key={i.id} coordinate={{ latitude: i.lat!, longitude: i.lng! }} title={i.title} description={i.time} />
            ))}
          </MapView>
        </View>
      )}

      {/* 新增任務 Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editingId ? '✏️ 修改' : '＋ 新增'} Day {selectedDay} 任務</Text>
              
              <View style={styles.typeSelector}>
                <TouchableOpacity style={[styles.typeBtn, taskType === 'spot' && styles.typeBtnActive]} onPress={() => setTaskType('spot')}><Text style={[styles.typeBtnText, taskType === 'spot' && styles.typeBtnTextActive]}>⛩️ 景點</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.typeBtn, taskType === 'food' && styles.typeBtnActive]} onPress={() => setTaskType('food')}><Text style={[styles.typeBtnText, taskType === 'food' && styles.typeBtnTextActive]}>🍔 美食</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.typeBtn, taskType === 'transport' && styles.typeBtnActive]} onPress={() => setTaskType('transport')}><Text style={[styles.typeBtnText, taskType === 'transport' && styles.typeBtnTextActive]}>🚆 交通</Text></TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>時間區間</Text>
              <View style={styles.timePickerRow}>
                <TouchableOpacity style={styles.timeBtn} onPress={() => { setShowStartPicker(true); setShowEndPicker(false); }}>
                  <Text style={styles.timeBtnText}>{formatTime(startTime)}</Text>
                </TouchableOpacity>
                <Text style={styles.timeDivider}>～</Text>
                <TouchableOpacity style={styles.timeBtn} onPress={() => { setShowEndPicker(true); setShowStartPicker(false); }}>
                  <Text style={styles.timeBtnText}>{formatTime(endTime)}</Text>
                </TouchableOpacity>
              </View>

              {showStartPicker && (
                <View style={Platform.OS === 'ios' ? styles.iosPickerWrapper : {}}>
                  <DateTimePicker value={startTime} mode="time" is24Hour={true} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(e, d) => { if (Platform.OS === 'android') setShowStartPicker(false); if (d) setStartTime(d); }} />
                  {Platform.OS === 'ios' && <TouchableOpacity style={styles.iosDoneBtn} onPress={() => setShowStartPicker(false)}><Text style={styles.iosDoneBtnText}>確定完成</Text></TouchableOpacity>}
                </View>
              )}

              {showEndPicker && (
                <View style={Platform.OS === 'ios' ? styles.iosPickerWrapper : {}}>
                  <DateTimePicker value={endTime} mode="time" is24Hour={true} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(e, d) => { if (Platform.OS === 'android') setShowEndPicker(false); if (d) setEndTime(d); }} />
                  {Platform.OS === 'ios' && <TouchableOpacity style={styles.iosDoneBtn} onPress={() => setShowEndPicker(false)}><Text style={styles.iosDoneBtnText}>確定完成</Text></TouchableOpacity>}
                </View>
              )}

              <Text style={styles.inputLabel}>標題</Text>
              <TextInput style={styles.input} placeholder="例: 清水寺" placeholderTextColor="#A1887F" value={taskTitle} onChangeText={setTaskTitle} />

              <Text style={styles.inputLabel}>地點 (輸入明確地標，如: 台北101)</Text>
              <TextInput style={styles.input} placeholder="例: 京都市東山區" placeholderTextColor="#A1887F" value={taskLocation} onChangeText={setTaskLocation} />

              <Text style={styles.inputLabel}>備註</Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="輸入備註事項..." placeholderTextColor="#A1887F" multiline numberOfLines={3} value={taskDesc} onChangeText={setTaskDesc} textAlignVertical="top" />

              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={[styles.modalBtn, styles.btnCancel]} onPress={handleCloseModal} disabled={isSaving}><Text style={styles.btnCancelText}>取消</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.btnSave]} onPress={handleSaveTask} disabled={isSaving}>{isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnSaveText}>儲存</Text>}</TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF0' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop: 60, paddingBottom: 15, backgroundColor: '#FFFDF0' },
  headerTitle: { flex: 1, fontSize: 14, fontFamily: 'PressStart2P_400Regular', color: '#4A342E', marginRight: 10 },
  headerActions: { flexDirection: 'row', gap: 10 },
  toggleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#AED6F1', borderWidth: 2, borderColor: '#4A342E', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 4 },
  toggleButtonText: { fontFamily: 'PressStart2P_400Regular', fontSize: 10, color: '#4A342E', marginLeft: 5 },
  addButton: { backgroundColor: '#F4D03F', borderWidth: 2, borderColor: '#4A342E', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 4 },
  addButtonText: { fontFamily: 'PressStart2P_400Regular', fontSize: 10, color: '#4A342E' },
  
  daysContainer: { borderBottomWidth: 4, borderBottomColor: '#D7CCC8', backgroundColor: '#FFFDF0', paddingBottom: 10 },
  daysScroll: { paddingHorizontal: 15, gap: 10, alignItems: 'center' },
  dayTab: { backgroundColor: '#EFEBE9', borderWidth: 2, borderColor: '#4A342E', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 4 },
  dayTabActive: { backgroundColor: '#F4D03F', borderBottomWidth: 2, marginTop: 2 },
  dayTabText: { fontFamily: 'PressStart2P_400Regular', fontSize: 10, color: '#8D6E63' },
  dayTabTextActive: { color: '#4A342E' },
  addDayBtn: { backgroundColor: '#2ECC71', borderWidth: 2, borderColor: '#4A342E', width: 35, height: 35, justifyContent: 'center', alignItems: 'center', borderRadius: 18, borderBottomWidth: 4, marginLeft: 5 },
  addDayText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  emptyState: { padding: 40, alignItems: 'center' },
  emptyStateText: { fontFamily: 'PressStart2P_400Regular', fontSize: 12, color: '#A1887F', textAlign: 'center', lineHeight: 24 },
  mapContainer: { flex: 1 },
  map: { width: '100%', height: '100%' },
  scrollContent: { paddingBottom: 40 },
  timelineContainer: { position: 'relative', paddingLeft: 40, paddingRight: 20, paddingTop: 30 },
  verticalLine: { position: 'absolute', left: 20, top: 0, bottom: 0, width: 4, backgroundColor: '#4A342E' },
  itemWrapper: { position: 'relative', marginBottom: 25 },
  dotNormal: { position: 'absolute', left: -26, top: 15, width: 16, height: 16, backgroundColor: '#F4D03F', borderWidth: 3, borderColor: '#4A342E', borderRadius: 8 },
  dotWarning: { position: 'absolute', left: -26, top: 15, width: 16, height: 16, backgroundColor: '#E84A41', borderWidth: 3, borderColor: '#4A342E' },
  dotTransport: { position: 'absolute', left: -23, top: 10, width: 10, height: 10, backgroundColor: '#FFFDF0', borderWidth: 3, borderColor: '#4A342E', borderRadius: 5 },
  card: { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#4A342E', padding: 15, marginLeft: 10, shadowColor: "#000", shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0 },
  warningCard: { borderColor: '#E84A41', borderWidth: 4 },
  
  // 🌟 修改：外層清單的時間標籤變更為「亮黃底色＋深咖啡字」
  timeTag: { backgroundColor: '#F4D03F', paddingVertical: 4, paddingHorizontal: 8, borderWidth: 2, borderColor: '#4A342E', borderBottomWidth: 4 },
  timeTagText: { fontSize: 10, fontFamily: 'PressStart2P_400Regular', color: '#4A342E' },

  cardTitle: { fontSize: 16, fontFamily: 'PressStart2P_400Regular', color: '#4A342E', marginBottom: 10, lineHeight: 22 },
  cardDesc: { fontSize: 12, color: '#4A342E', marginTop: 10, fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderWidth: 2, borderColor: '#000', borderBottomWidth: 4 },
  btnMap: { backgroundColor: '#2980B9' },
  btnPic: { backgroundColor: '#AED6F1' },
  btnText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', marginLeft: 5 },
  btnTextDark: { color: '#4A342E', fontSize: 10, fontWeight: 'bold', marginLeft: 5 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#FFFDF0', borderWidth: 4, borderColor: '#4A342E', width: '100%', maxHeight: '85%', padding: 20, shadowColor: "#000", shadowOffset: { width: 8, height: 8 }, shadowOpacity: 1, shadowRadius: 0 },
  modalTitle: { fontFamily: 'PressStart2P_400Regular', fontSize: 14, color: '#4A342E', textAlign: 'center', marginBottom: 20 },
  typeSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  typeBtn: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#4A342E', paddingVertical: 10, marginHorizontal: 4, alignItems: 'center', borderBottomWidth: 4 },
  typeBtnActive: { backgroundColor: '#F4D03F', borderBottomWidth: 2, marginTop: 2 },
  typeBtnText: { fontSize: 12, fontWeight: 'bold', color: '#8D6E63' },
  typeBtnTextActive: { color: '#4A342E' },
  timePickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  
  // 🌟 修改：表單內的時間按鈕也變更為「亮黃底色＋深咖啡字」
  timeBtn: { flex: 1, backgroundColor: '#F4D03F', borderWidth: 2, borderColor: '#4A342E', paddingVertical: 12, alignItems: 'center', borderBottomWidth: 4 },
  timeBtnText: { fontSize: 14, fontFamily: 'PressStart2P_400Regular', color: '#4A342E' },
  
  timeDivider: { marginHorizontal: 10, fontSize: 16, fontFamily: 'PressStart2P_400Regular', color: '#4A342E' },
  iosPickerWrapper: { backgroundColor: '#EFEBE9', borderWidth: 2, borderColor: '#4A342E', padding: 10, marginBottom: 15, alignItems: 'center' },
  iosDoneBtn: { backgroundColor: '#2ECC71', paddingVertical: 10, paddingHorizontal: 25, borderWidth: 2, borderColor: '#4A342E', borderBottomWidth: 4, marginTop: 10 },
  iosDoneBtnText: { color: '#FFF', fontFamily: 'PressStart2P_400Regular', fontSize: 10 },
  inputLabel: { fontSize: 12, fontFamily: 'PressStart2P_400Regular', color: '#4A342E', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#4A342E', padding: 12, fontSize: 14, color: '#4A342E', fontWeight: 'bold' },
  textArea: { height: 80 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 15, alignItems: 'center', borderWidth: 3, borderColor: '#4A342E', borderBottomWidth: 6 },
  btnCancel: { backgroundColor: '#D7CCC8' },
  btnSave: { backgroundColor: '#E84A41' },
  btnCancelText: { fontFamily: 'PressStart2P_400Regular', fontSize: 12, color: '#4A342E' },
  btnSaveText: { fontFamily: 'PressStart2P_400Regular', fontSize: 12, color: '#FFF' },
});