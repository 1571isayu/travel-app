import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import {
  CheckSquare,
  ClipboardList,
  CreditCard,
  Pencil,
  Plus,
  Square,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

// 定義資料型別
type TodoItem = { id: string; text: string; completed: boolean };
type Document = { id: string; uri: string; title: string; note: string };

export default function BackpackScreen() {
  const [activeTab, setActiveTab] = useState<"todo" | "wallet">("todo");

  // Todo State
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState("");

  // Wallet State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 新增/編輯 Modal State
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalNote, setModalNote] = useState("");
  const [modalImageUri, setModalImageUri] = useState<string | null>(null);

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

    // 修正點：點擊新增時主動收起鍵盤，避免 UI 卡頓或手勢衝突
    Keyboard.dismiss();

    const updated = [
      ...todos,
      { id: Date.now().toString(), text: newTodo, completed: false },
    ];
    setTodos(updated);
    setNewTodo("");
    saveData(updated, documents);
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    );
    setTodos(updated);
    saveData(updated, documents);
  };

  const deleteTodo = (id: string) => {
    const updated = todos.filter((t) => t.id !== id);
    setTodos(updated);
    saveData(updated, documents);
  };

  // --- 錢包邏輯 ---
  const openAddModal = () => {
    setEditingDoc(null);
    setModalTitle("");
    setModalNote("");
    setModalImageUri(null);
    setIsAddModalVisible(true);
  };

  const openEditModal = (doc: Document) => {
    setEditingDoc(doc);
    setModalTitle(doc.title);
    setModalNote(doc.note);
    setModalImageUri(doc.uri);
    setIsAddModalVisible(true);
  };

  const closeAddModal = () => {
    setIsAddModalVisible(false);
    setEditingDoc(null);
    setModalTitle("");
    setModalNote("");
    setModalImageUri(null);
  };

  const pickImageInModal = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setModalImageUri(result.assets[0].uri);
    }
  };

  const saveDocument = async () => {
    if (!modalImageUri) return;
    if (editingDoc) {
      // 編輯模式
      const updated = documents.map((d) =>
        d.id === editingDoc.id
          ? {
              ...d,
              title: modalTitle || "未命名",
              note: modalNote,
              uri: modalImageUri,
            }
          : d,
      );
      setDocuments(updated);
      saveData(todos, updated);
    } else {
      // 新增模式
      const newDoc: Document = {
        id: Date.now().toString(),
        uri: modalImageUri,
        title: modalTitle || "未命名",
        note: modalNote,
      };
      const updated = [...documents, newDoc];
      setDocuments(updated);
      saveData(todos, updated);
    }
    closeAddModal();
  };

  const deleteDoc = (id: string) => {
    const updated = documents.filter((d) => d.id !== id);
    setDocuments(updated);
    saveData(todos, updated);
  };

  return (
    <View style={styles.container}>
      {/* 頂部切換 Tab */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "todo" && styles.activeTab]}
          onPress={() => setActiveTab("todo")}
        >
          <ClipboardList
            color={activeTab === "todo" ? "#FFF" : "#4A342E"}
            size={20}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "todo" && styles.activeTabText,
            ]}
          >
            準備清單
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "wallet" && styles.activeTab]}
          onPress={() => setActiveTab("wallet")}
        >
          <CreditCard
            color={activeTab === "wallet" ? "#FFF" : "#4A342E"}
            size={20}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === "wallet" && styles.activeTabText,
            ]}
          >
            數位證件
          </Text>
        </TouchableOpacity>
      </View>

      <Image
        source={require("../../img/ad_line.png")}
        style={styles.separator}
      />

      {activeTab === "todo" ? (
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
        >
          {/* 使用 ScrollView 將輸入框與列表包在一起，並確保點擊事件不被攔截 */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled" // 關鍵：確保點擊按鈕時不會因為收鍵盤而失效
          >
            {/* 將輸入框移入 ScrollView 頂部 */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.pixelInput}
                placeholder="新增裝備..."
                value={newTodo}
                onChangeText={setNewTodo}
                returnKeyType="done"
                onSubmitEditing={addTodo}
              />
              <TouchableOpacity style={styles.addBtn} onPress={addTodo}>
                <Plus color="#FFF" size={24} />
              </TouchableOpacity>
            </View>

            {/* 渲染列表 */}
            {todos.map((item) => (
              <View key={item.id} style={styles.todoItem}>
                <TouchableOpacity
                  onPress={() => toggleTodo(item.id)}
                  style={styles.todoTextRow}
                >
                  {item.completed ? (
                    <CheckSquare color="#4CAF50" size={24} />
                  ) : (
                    <Square color="#4A342E" size={24} />
                  )}
                  <Text
                    style={[
                      styles.todoText,
                      item.completed && styles.todoCompleted,
                    ]}
                  >
                    {item.text}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTodo(item.id)}>
                  <Trash2 color="#E74C3C" size={20} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.content}>
          {/* 拍立得卡片 Grid */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.docGrid}
          >
            {documents.map((doc) => (
              <View key={doc.id} style={styles.polaroidCardContainer}>
                <View style={styles.polaroidShadow} />
                <View style={styles.polaroidCard}>
                  <TouchableOpacity
                    onPress={() => setSelectedImage(doc.uri)}
                    activeOpacity={0.85}
                    style={styles.imageContainer}
                  >
                    <Image
                      source={{ uri: doc.uri }}
                      style={styles.polaroidImage}
                    />
                  </TouchableOpacity>

                  <View style={styles.polaroidBottom}>
                    <Text style={styles.polaroidTitle} numberOfLines={1}>
                      {doc.title}
                    </Text>

                    <View style={styles.polaroidFooterRow}>
                      {doc.note && doc.note.trim() ? (
                        <Text style={styles.polaroidNote} numberOfLines={1}>
                          {doc.note}
                        </Text>
                      ) : (
                        <View style={styles.polaroidNoteBlank} />
                      )}

                      <View style={styles.polaroidActions}>
                        <TouchableOpacity
                          onPress={() => openEditModal(doc)}
                          style={styles.polaroidActionBtn}
                        >
                          <Pencil color="#8D6E63" size={14} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => deleteDoc(doc.id)}
                          style={styles.polaroidActionBtn}
                        >
                          <Trash2 color="#E74C3C" size={14} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* FAB 新增按鈕 */}
          <TouchableOpacity style={styles.fab} onPress={openAddModal}>
            <Plus color="#FFF" size={32} />
          </TouchableOpacity>
        </View>
      )}

      {/* 圖片放大檢視 Modal */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.fullImageOverlay}>
          <TouchableOpacity
            style={styles.fullImageCloseBtn}
            onPress={() => setSelectedImage(null)}
          >
            <X color="#FFF" size={32} />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* 新增 / 編輯拍立得 Modal */}
      <Modal visible={isAddModalVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.keyboardAvoidingView}
            >
              <View style={styles.modalCardContainer}>
                <View style={styles.modalCardShadow} />
                <View style={styles.modalCard}>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {/* Modal 標題輸入 */}
                    <View style={styles.modalHeader}>
                      <TextInput
                        style={styles.modalTitleInput}
                        placeholder="請在此輸入圖片名稱"
                        placeholderTextColor="#9A8478"
                        value={modalTitle}
                        onChangeText={setModalTitle}
                      />
                      <Pencil
                        color="#5E433B"
                        size={16}
                        style={{ marginLeft: 6 }}
                      />
                    </View>

                    <Image
                      source={require("../../img/ad_line.png")}
                      style={styles.modalSeparator}
                    />

                    {/* 圖片上傳區 */}
                    <Text style={styles.modalLabel}>圖片</Text>
                    <TouchableOpacity
                      style={styles.imagePickerBox}
                      onPress={pickImageInModal}
                      activeOpacity={0.8}
                    >
                      {modalImageUri ? (
                        <Image
                          source={{ uri: modalImageUri }}
                          style={styles.imagePickerPreview}
                          resizeMode="cover"
                        />
                      ) : (
                        <Text style={styles.imagePickerText}>
                          點此上傳圖片+
                        </Text>
                      )}
                    </TouchableOpacity>

                    {/* 備註輸入 */}
                    <Text style={styles.modalLabel}>備註</Text>
                    <TextInput
                      style={styles.modalNoteInput}
                      placeholder="請輸入備註..."
                      placeholderTextColor="#9A8478"
                      value={modalNote}
                      onChangeText={setModalNote}
                      multiline
                    />
                  </ScrollView>

                  {/* 按鈕列 */}
                  <View style={styles.modalBtnRow}>
                    <View style={styles.modalBtnContainer}>
                      <View
                        style={[
                          styles.modalBtnShadow,
                          { backgroundColor: "#8A9A84" },
                        ]}
                      />
                      <TouchableOpacity
                        style={[
                          styles.modalBtn,
                          { backgroundColor: "#C2D1BC" },
                        ]}
                        onPress={closeAddModal}
                      >
                        <Text style={styles.modalBtnText}>cancel</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.modalBtnContainer}>
                      <View
                        style={[
                          styles.modalBtnShadow,
                          { backgroundColor: "#9E4714" },
                        ]}
                      />
                      <TouchableOpacity
                        style={[
                          styles.modalBtn,
                          { backgroundColor: "#EC7424" },
                        ]}
                        onPress={saveDocument}
                      >
                        <Text style={[styles.modalBtnText, { color: "#FFF" }]}>
                          save
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFBF0", paddingTop: 60 },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#4A342E",
    backgroundColor: "#FFF",
    gap: 8,
  },
  activeTab: { backgroundColor: "#4A342E" },
  tabText: { color: "#4A342E", fontWeight: "bold", fontSize: 14 },
  activeTabText: { color: "#FFF" },
  separator: { width: "100%", height: 10, resizeMode: "contain" },
  content: { flex: 1, padding: 20 },

  // 清單樣式
  inputRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  pixelInput: {
    flex: 1,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#4A342E",
    padding: 10,
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: "#F39C12",
    padding: 10,
    borderWidth: 2,
    borderColor: "#4A342E",
    justifyContent: "center",
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    padding: 15,
    borderWidth: 2,
    borderColor: "#4A342E",
    marginBottom: 10,
  },
  todoTextRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  todoText: { fontSize: 16, color: "#4A342E", fontWeight: "bold" },
  todoCompleted: { textDecorationLine: "line-through", color: "#BDC3C7" },

  docGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingBottom: 120,
  },

  // 拍立得卡片樣式
  polaroidCardContainer: {
    width: "48%",
    marginBottom: 20,
    position: "relative",
  },
  polaroidShadow: {
    position: "absolute",
    top: 5,
    left: 5,
    right: -5,
    bottom: -5,
    backgroundColor: "#5E433B",
    borderWidth: 2,
    borderColor: "#5E433B",
  },
  polaroidCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#5E433B",
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#EDE8DC",
    borderWidth: 1.5,
    borderColor: "#5E433B",
  },
  polaroidImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  polaroidBottom: {
    height: 56,
    justifyContent: "space-between",
    paddingVertical: 6,
    backgroundColor: "#FFF",
  },
  polaroidTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#4A342E",
  },
  polaroidFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  polaroidActions: {
    flexDirection: "row",
    gap: 8,
  },
  polaroidActionBtn: {
    padding: 2,
  },
  polaroidNote: {
    fontSize: 12,
    color: "#8D6E63",
    height: 16,
    lineHeight: 16,
    flex: 1,
    marginRight: 6,
  },
  polaroidNoteBlank: {
    height: 16,
    flex: 1,
  },
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
  fullImageOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: { width: "95%", height: "80%" },
  fullImageCloseBtn: { position: "absolute", top: 50, right: 30, zIndex: 10 },

  // --- 新增/編輯 Modal 專區 ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardAvoidingView: {
    width: "88%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCardContainer: {
    width: "100%",
    position: "relative",
  },
  modalCardShadow: {
    position: "absolute",
    top: 6,
    left: 6,
    right: -6,
    bottom: -6,
    backgroundColor: "#5E433B",
    borderRadius: 0,
  },
  modalCard: {
    width: "100%",
    maxHeight: 480,
    backgroundColor: "#FDFBF0",
    borderWidth: 2,
    borderColor: "#5E433B",
    borderRadius: 0,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  modalTitleInput: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    color: "#5E433B",
    fontWeight: "bold",
  },
  modalSeparator: {
    width: "100%",
    height: 8,
    resizeMode: "contain",
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#5E433B",
    marginBottom: 6,
  },
  imagePickerBox: {
    width: "100%",
    height: 150,
    backgroundColor: "#F3EFE6",
    borderWidth: 2,
    borderColor: "#5E433B",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    overflow: "hidden",
  },
  imagePickerPreview: { width: "100%", height: "100%" },
  imagePickerText: { color: "#5E433B", fontSize: 14, fontWeight: "500" },
  modalNoteInput: {
    width: "100%",
    height: 90,
    backgroundColor: "#F3EFE6",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 10,
    textAlignVertical: "top",
    fontSize: 14,
    color: "#5E433B",
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 4,
    marginBottom: 2,
  },
  modalBtnContainer: {
    flex: 1,
    position: "relative",
    height: 45,
  },
  modalBtnShadow: {
    position: "absolute",
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    borderRadius: 0,
  },
  modalBtn: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: "#5E433B",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
  },
  modalBtnText: {
    fontWeight: "bold",
    fontSize: 14,
    fontFamily: "PressStart2P",
  },
});
