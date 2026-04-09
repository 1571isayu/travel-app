import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { CheckSquare, ClipboardList, CreditCard, Plus, Square, Trash2, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// 定義資料型別
type TodoItem = { id: string; text: string; completed: boolean };
type Document = { id: string; uri: string; title: string };

export default function BackpackScreen() {
  const [activeTab, setActiveTab] = useState<"todo" | "wallet">("todo");
  
  // Todo State
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState("");

  // Wallet State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // --- 資料持久化 ---
  const loadData = async () => {
    const savedTodos = await AsyncStorage.getItem("@backpack_todos");
    const savedDocs = await AsyncStorage.getItem("@backpack_docs");
    if (savedTodos) setTodos(JSON.parse(savedTodos));
    if (savedDocs) setDocuments(JSON.parse(savedDocs));
  };

  const saveData = async (newTodos: TodoItem[], newDocs: Document[]) => {
    await AsyncStorage.setItem("@backpack_todos", JSON.stringify(newTodos));
    await AsyncStorage.setItem("@backpack_docs", JSON.stringify(newDocs));
  };

  // --- 清單邏輯 ---
  const addTodo = () => {
    if (!newTodo.trim()) return;
    const updated = [...todos, { id: Date.now().toString(), text: newTodo, completed: false }];
    setTodos(updated);
    setNewTodo("");
    saveData(updated, documents);
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(updated);
    saveData(updated, documents);
  };

  const deleteTodo = (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    saveData(updated, documents);
  };

  // --- 錢包邏輯 ---
  const pickDocument = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      Alert.prompt("證件名稱", "請輸入此證件的名稱 (如: 護照, 簽證)", async (title) => {
        const updated = [...documents, { id: Date.now().toString(), uri: result.assets[0].uri, title: title || "未命名證件" }];
        setDocuments(updated);
        saveData(todos, updated);
      });
    }
  };

  const deleteDoc = (id: string) => {
    Alert.alert("刪除證件", "確定要移除這張證件圖檔嗎？", [
      { text: "取消" },
      { text: "刪除", style: "destructive", onPress: () => {
        const updated = documents.filter(d => d.id !== id);
        setDocuments(updated);
        saveData(todos, updated);
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      {/* 頂部切換 Tab */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === "todo" && styles.activeTab]} 
          onPress={() => setActiveTab("todo")}
        >
          <ClipboardList color={activeTab === "todo" ? "#FFF" : "#4A342E"} size={20} />
          <Text style={[styles.tabText, activeTab === "todo" && styles.activeTabText]}>準備清單</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === "wallet" && styles.activeTab]} 
          onPress={() => setActiveTab("wallet")}
        >
          <CreditCard color={activeTab === "wallet" ? "#FFF" : "#4A342E"} size={20} />
          <Text style={[styles.tabText, activeTab === "wallet" && styles.activeTabText]}>數位錢包</Text>
        </TouchableOpacity>
      </View>

      <Image source={require("../../img/ad_line.png")} style={styles.separator} />

      {activeTab === "todo" ? (
        <View style={styles.content}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.pixelInput}
              placeholder="新增裝備..."
              value={newTodo}
              onChangeText={setNewTodo}
            />
            <TouchableOpacity style={styles.addBtn} onPress={addTodo}>
              <Plus color="#FFF" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {todos.map(item => (
              <View key={item.id} style={styles.todoItem}>
                <TouchableOpacity onPress={() => toggleTodo(item.id)} style={styles.todoTextRow}>
                  {item.completed ? <CheckSquare color="#4CAF50" size={24} /> : <Square color="#4A342E" size={24} />}
                  <Text style={[styles.todoText, item.completed && styles.todoCompleted]}>{item.text}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTodo(item.id)}>
                  <Trash2 color="#E74C3C" size={20} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.content}>
          <TouchableOpacity style={styles.uploadBox} onPress={pickDocument}>
            <Plus color="#4A342E" size={30} />
            <Text style={styles.uploadText}>上傳證件截圖</Text>
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.docGrid}>
            {documents.map(doc => (
              <View key={doc.id} style={styles.docCard}>
                <TouchableOpacity onPress={() => setSelectedImage(doc.uri)}>
                  <Image source={{ uri: doc.uri }} style={styles.docThumbnail} />
                </TouchableOpacity>
                <View style={styles.docFooter}>
                  <Text style={styles.docTitle} numberOfLines={1}>{doc.title}</Text>
                  <TouchableOpacity onPress={() => deleteDoc(doc.id)}>
                    <Trash2 color="#E74C3C" size={16} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 圖片放大檢視 Modal */}
      <Modal visible={!!selectedImage} transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedImage(null)}>
            <X color="#FFF" size={32} />
          </TouchableOpacity>
          {selectedImage && <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFBF0", paddingTop: 60 },
  tabContainer: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 10 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderWidth: 2, borderColor: "#4A342E", backgroundColor: "#FFF", gap: 8 },
  activeTab: { backgroundColor: "#4A342E" },
  tabText: { color: "#4A342E", fontWeight: "bold", fontSize: 14 },
  activeTabText: { color: "#FFF" },
  separator: { width: "100%", height: 10, resizeMode: "contain" },
  content: { flex: 1, padding: 20 },
  
  // 清單樣式
  inputRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  pixelInput: { flex: 1, backgroundColor: "#FFF", borderWidth: 2, borderColor: "#4A342E", padding: 10, fontSize: 16 },
  addBtn: { backgroundColor: "#F39C12", padding: 10, borderWidth: 2, borderColor: "#4A342E", justifyContent: "center" },
  todoItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", padding: 15, borderWidth: 2, borderColor: "#4A342E", marginBottom: 10 },
  todoTextRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  todoText: { fontSize: 16, color: "#4A342E", fontWeight: "bold" },
  todoCompleted: { textDecorationLine: "line-through", color: "#BDC3C7" },

  // 錢包樣式
  uploadBox: { width: "100%", height: 80, borderStyle: "dashed", borderWidth: 2, borderColor: "#4A342E", borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 20, flexDirection: "row", gap: 10 },
  uploadText: { color: "#4A342E", fontWeight: "bold" },
  docGrid: { flexDirection: "row", flexWrap: "wrap", gap: 15 },
  docCard: { width: "47%", backgroundColor: "#FFF", borderWidth: 2, borderColor: "#4A342E", padding: 5 },
  docThumbnail: { width: "100%", height: 120, resizeMode: "cover" },
  docFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 5 },
  docTitle: { fontSize: 12, color: "#4A342E", fontWeight: "bold", flex: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  fullImage: { width: "95%", height: "80%" },
  closeBtn: { position: "absolute", top: 50, right: 30, zIndex: 10 }
});