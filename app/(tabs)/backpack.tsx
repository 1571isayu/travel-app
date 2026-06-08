import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";

import { COLORS } from "@/constants/theme";
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
  useWindowDimensions,
  View
} from "react-native";
// 定義資料型別
type TodoItem = { id: string; text: string; completed: boolean };
type Document = { id: string; uri: string; title: string; note: string };

export default function BackpackScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<"todo" | "wallet">("todo");
  //左右滑動頁面
  const horizontalScrollRef = useRef<ScrollView>(null);
  // Todo States
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null);

  // 🔴 複選模式 States
  const [isSelectMode, setIsSelectMode] = useState(false); // 是否啟動複選模式
  const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([]); // 紀錄被選中的 Todo ID 陣列

  // TextInput 的 Ref
  const todoInputRef = useRef<TextInput>(null);

  // Wallet State
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 新增/編輯 Modal State (Wallet)
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalNote, setModalNote] = useState("");
  const [modalImageUri, setModalImageUri] = useState<string | null>(null);

  // 客製化刪除確認 Modal States
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);

  useEffect(() => {
    loadData();

  }, []);
  // 點擊上方標籤時，讓 ScrollView 滾動到對應位置
  const switchTab = (tab: "todo" | "wallet") => {
    setActiveTab(tab);
    const offsetX = tab === "todo" ? 0 : screenWidth;
    horizontalScrollRef.current?.scrollTo({ x: offsetX, animated: true });
  };

  // 左右滑動結束後，更新目前的 Tab 狀態
  const handleMomentumScrollEnd = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(offsetX / screenWidth);
    setActiveTab(pageIndex === 0 ? "todo" : "wallet");
  };
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
  const handleTodoSubmit = () => {
    if (!newTodo.trim()) return;
    Keyboard.dismiss();

    if (editingTodo) {
      const updated = todos.map((t) =>
        t.id === editingTodo.id ? { ...t, text: newTodo.trim() } : t
      );
      setTodos(updated);
      setEditingTodo(null);
      setNewTodo("");
      saveData(updated, documents);
    } else {
      const updated = [
        ...todos,
        { id: Date.now().toString(), text: newTodo.trim(), completed: false },
      ];
      setTodos(updated);
      setNewTodo("");
      saveData(updated, documents);
    }
  };

  // 🔴 長按清單項目：直接啟動「複選刪除模式」
  const handleLongPressTodo = (item: TodoItem) => {
    if (editingTodo) {
      setEditingTodo(null);
      setNewTodo("");
    }
    Keyboard.dismiss();
    setIsSelectMode(true);
    setSelectedTodoIds([item.id]); // 自動勾選長按的這筆
  };

  // 🔴 點擊清單項目（區分普通模式與複選模式）
  const handlePressTodo = (item: TodoItem) => {
    if (isSelectMode) {
      // 複選模式下：點擊切換選取狀態
      if (selectedTodoIds.includes(item.id)) {
        const nextIds = selectedTodoIds.filter(id => id !== item.id);
        setSelectedTodoIds(nextIds);
        if (nextIds.length === 0) setIsSelectMode(false); // 沒選半個就自動退出複選
      } else {
        setSelectedTodoIds([...selectedTodoIds, item.id]);
      }
    } else {
      // 普通模式下：點擊進入單筆編輯
      setEditingTodo(item);
      setNewTodo(item.text);
      setTimeout(() => {
        todoInputRef.current?.focus();
      }, 50);
    }
  };

  // 點擊左側勾勾（僅在普通模式下切換完成狀態）
  const handleToggleComplete = (item: TodoItem) => {
    if (isSelectMode) {
      handlePressTodo(item); // 複選模式下點哪裡都是選取
      return;
    }
    const updated = todos.map((t) =>
      t.id === item.id ? { ...t, completed: !t.completed } : t,
    );
    setTodos(updated);
    saveData(updated, documents);
  };

  // 退出複選模式
  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedTodoIds([]);
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
      const updated = documents.map((d) =>
        d.id === editingDoc.id
          ? { ...d, title: modalTitle || "未命名", note: modalNote, uri: modalImageUri }
          : d,
      );
      setDocuments(updated);
      saveData(todos, updated);
    } else {
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

  // 錢包卡片長按
  const handleLongPressDoc = (doc: Document) => {
    setDeletingDoc(doc);
    setIsDeleteModalVisible(true);
  };

  // 🔴 刪除確認
  const confirmDelete = () => {
    if (isSelectMode && selectedTodoIds.length > 0) {
      // 執行複選集體丟棄
      const updated = todos.filter((t) => !selectedTodoIds.includes(t.id));
      setTodos(updated);
      setIsSelectMode(false);
      setSelectedTodoIds([]);
      saveData(updated, documents);
    } else if (deletingDoc) {
      // 執行錢包卡片丟棄
      const updated = documents.filter((d) => d.id !== deletingDoc.id);
      setDocuments(updated);
      saveData(todos, updated);
    }
    setIsDeleteModalVisible(false);
    setDeletingDoc(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* 頂部切換 Tab (在複選模式下隱藏，改為複選工具列) */}
      {!isSelectMode ? (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "todo" && styles.activeTab]}
            onPress={() => switchTab("todo")}
          >
            <Text style={[styles.tabText, activeTab === "todo" && styles.activeTabText]}>
              準備清單
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "wallet" && styles.activeTab]}
            onPress={() => switchTab("wallet")}
          >
            <Text style={[styles.tabText, activeTab === "wallet" && styles.activeTabText]}>
              數位證件
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* 🔴 全新：複選模式專用頂部工具列 */
        <View style={styles.batchActionHeader}>
          <TouchableOpacity onPress={exitSelectMode} style={styles.batchCancelBtn}>
            <Text style={styles.batchCancelText}>取消</Text>
          </TouchableOpacity>
          <Text style={styles.batchTitle}>已選取 {selectedTodoIds.length} 個裝備</Text>
          <TouchableOpacity
            onPress={() => setIsDeleteModalVisible(true)}
            style={styles.batchDeleteBtn}
          >
            <Trash2 color="#FFF" size={16} style={{ marginRight: 4 }} />
            <Text style={styles.batchDeleteText}>丟棄</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.separatorContainer}>
        <Image source={require("../../img/ad_line.png")} style={styles.separator} />
      </View>

      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled // 開啟整頁翻動
        showsHorizontalScrollIndicator={false} // 隱藏底部捲軸
        bounces={false} // 避免在邊緣滑動時產生回彈效果（可依喜好保留）
        onMomentumScrollEnd={handleMomentumScrollEnd} // 綁定滑動結束事件
        style={{ flex: 1, width: "100%" }} // <--- 補上這一行
        contentContainerStyle={{ width: screenWidth * 2 }}
      >
        <View style={{ width: screenWidth, height: "100%", overflow: "hidden"}}>
          <View
            style={styles.contentTodoContainer}
          >
            {/* 上方：滾動列表區 */}
            <ScrollView
              style={styles.todoListScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {todos.map((item) => {
                const isSelected = selectedTodoIds.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.todoItem,
                      editingTodo?.id === item.id && styles.todoItemEditing,
                      isSelectMode && isSelected && styles.todoItemCheckedModal
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handlePressTodo(item)}
                    onLongPress={() => handleLongPressTodo(item)}
                    delayLongPress={600}
                  >
                    <View style={styles.todoTextRow}>
                      {/* 左側勾勾區域 */}
                      <TouchableOpacity
                        onPress={() => handleToggleComplete(item)}
                        style={{ marginRight: 12 }}
                      >
                        {isSelectMode ? (
                          /* 🔴 複選選取框樣式 */
                          <View style={[styles.selectCheckbox, isSelected && styles.selectCheckboxActive]}>
                            {isSelected && <Check color="#FFF" size={14} strokeWidth={3} />}
                          </View>
                        ) : (
                          /* 普通任務狀態勾勾 */
                          <View style={[styles.customCheckbox, item.completed && styles.customCheckboxChecked]}>
                            {item.completed && <Check color="#FFF" size={14} strokeWidth={3} />}
                          </View>
                        )}
                      </TouchableOpacity>

                      <Text style={[
                        styles.todoText,
                        item.completed && !isSelectMode && styles.todoCompleted,
                        isSelectMode && isSelected && { color: "#EC7424" }
                      ]}>
                        {item.text}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 下方：固定在最底部的輸入區（在複選模式下暫時鎖定/隱藏） */}
            {!isSelectMode && (
              <View style={styles.bottomInputContainer}>
                <View style={styles.inputRow}>
                  <TextInput
                    ref={todoInputRef}
                    style={[styles.pixelInput, editingTodo && styles.pixelInputEditing]}
                    placeholder={editingTodo ? "正在修改裝備..." : "新增裝備..."}
                    value={newTodo}
                    onChangeText={setNewTodo}
                    returnKeyType="done"
                    onSubmitEditing={handleTodoSubmit}
                  />
                  <TouchableOpacity
                    style={[styles.addBtn, editingTodo && { backgroundColor: "#3498DB" }]}
                    onPress={handleTodoSubmit}
                  >
                    {editingTodo ? <Check color="#FFF" size={24} /> : <Plus color="#FFF" size={24} />}
                  </TouchableOpacity>

                  {editingTodo && (
                    <TouchableOpacity
                      style={[styles.addBtn, { backgroundColor: "#95A5A6" }]}
                      onPress={() => {
                        setEditingTodo(null);
                        setNewTodo("");
                        Keyboard.dismiss();
                      }}
                    >
                      <X color="#FFF" size={24} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
        <View style={{ width: screenWidth, height: "100%",overflow: "hidden" }}>
          <View style={styles.content}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.docGrid}>
              {documents.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={styles.polaroidCardContainer}
                  activeOpacity={0.9}
                  onPress={() => openEditModal(doc)}
                  onLongPress={() => handleLongPressDoc(doc)}
                  delayLongPress={600}
                >
                  <View style={styles.polaroidShadow} />
                  <View style={styles.polaroidCard}>
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: doc.uri }} style={styles.polaroidImage} />
                    </View>
                    <View style={styles.polaroidBottom}>
                      <Text style={styles.polaroidTitle} numberOfLines={1}>{doc.title}</Text>
                      <View style={styles.polaroidFooterRow}>
                        {doc.note && doc.note.trim() ? (
                          <Text style={styles.polaroidNote} numberOfLines={1}>{doc.note}</Text>
                        ) : (
                          <View style={styles.polaroidNoteBlank} />
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={openAddModal}>
              <Plus color="#FFF" size={32} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>


      {/* 圖片放大檢視 Modal */}
      <Modal visible={!!selectedImage} transparent animationType="fade">
        <View style={styles.fullImageOverlay}>
          <TouchableOpacity style={styles.fullImageCloseBtn} onPress={() => setSelectedImage(null)}>
            <X color="#FFF" size={32} />
          </TouchableOpacity>
          {selectedImage && <Image source={{ uri: selectedImage }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>

      {/* 新增 / 編輯拍立得 Modal */}
      <Modal visible={isAddModalVisible} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.keyboardAvoidingView}
            >
              <View style={styles.modalCardContainerModal}>
                <View style={styles.modalCard}>
                  <View style={styles.dragIndicator} />
                  <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    <View style={styles.modalHeader}>
                      <TextInput
                        style={styles.modalTitleInput}
                        placeholder="請在此輸入圖片名稱"
                        placeholderTextColor="#9A8478"
                        value={modalTitle}
                        onChangeText={setModalTitle}
                      />
                      <Pencil color="#5E433B" size={16} style={{ marginLeft: 6 }} />
                    </View>
                    <Image source={require("../../img/ad_line.png")} style={styles.modalSeparator} />
                    <Text style={styles.modalLabel}>圖片</Text>
                    <TouchableOpacity style={styles.imagePickerBox} onPress={pickImageInModal} activeOpacity={0.8}>
                      {modalImageUri ? (
                        <Image source={{ uri: modalImageUri }} style={styles.imagePickerPreview} resizeMode="cover" />
                      ) : (
                        <Text style={styles.imagePickerText}>點此上傳圖片+</Text>
                      )}
                    </TouchableOpacity>
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
                  <View style={styles.modalBtnRow}>
                    <View style={styles.modalBtnContainer}>
                      <View style={[styles.modalBtnShadow, { backgroundColor: "#8A9A84" }]} />
                      <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#C2D1BC" }]} onPress={closeAddModal}>
                        <Text style={styles.modalBtnText}>cancel</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.modalBtnContainer}>
                      <View style={[styles.modalBtnShadow, { backgroundColor: "#9E4714" }]} />
                      <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#EC7424" }]} onPress={saveDocument}>
                        <Text style={[styles.modalBtnText, { color: "#FFF" }]}>save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* 客製化 Y2K 風格「刪除確認視窗」 */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertCardContainer}>
            <View style={styles.alertCardShadow} />
            <View style={styles.alertCard}>
              <Text style={styles.alertTitle}>
                {isSelectMode ? "批量丟棄裝備" : "刪除證件"}
              </Text>

              <Image source={require("../../img/ad_line.png")} style={styles.modalSeparator} />

              <Text style={styles.alertMessage}>
                {isSelectMode
                  ? `確定要將選中的 ${selectedTodoIds.length} 個裝備從背包中集體丟棄嗎？`
                  : `確定要將「${deletingDoc?.title}」從背包中丟棄嗎？`}
              </Text>

              <View style={styles.modalBtnRow}>
                <View style={styles.modalBtnContainer}>
                  <View style={[styles.modalBtnShadow, { backgroundColor: "#8A9A84" }]} />
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: "#C2D1BC" }]}
                    onPress={() => setIsDeleteModalVisible(false)}
                  >
                    <Text style={styles.modalBtnText}>取消</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBtnContainer}>
                  <View style={[styles.modalBtnShadow, { backgroundColor: "#9E4714" }]} />
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: "#EC7424" }]}
                    onPress={confirmDelete}
                  >
                    <Text style={[styles.modalBtnText, { color: "#FFF" }]}>丟棄</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 60 },
  tabContainer: { flexDirection: "row", paddingHorizontal: 20, gap: 10, height: 46, alignItems: "center" },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderWidth: 2, borderColor: "#4A342E", backgroundColor: "#FFF", gap: 8 },
  activeTab: { backgroundColor: "#4A342E" },
  tabText: { color: "#4A342E", fontWeight: "bold", fontSize: 14 },
  activeTabText: { color: "#FFF" },
  separatorContainer: { marginTop: 10 },
  separator: { width: "100%", height: 10, resizeMode: "contain" },
  content: { flex: 1, padding: 20 },

  // 🔴 全新：複選頂部工具列樣式
  batchActionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 46,
    backgroundColor: "#FDFBF0",
  },
  batchTitle: { fontSize: 15, fontWeight: "bold", color: "#4A342E" },
  batchCancelBtn: { paddingVertical: 6, paddingHorizontal: 12, borderWidth: 2, borderColor: "#4A342E", backgroundColor: "#FFF" },
  batchCancelText: { color: "#4A342E", fontWeight: "bold", fontSize: 13 },
  batchDeleteBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 12, borderWidth: 2, borderColor: "#4A342E", backgroundColor: "#E74C3C" },
  batchDeleteText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },

  contentTodoContainer: { flex: 1 },
  todoListScroll: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
  bottomInputContainer: {
    backgroundColor: "#FDFBF0",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: 2,
    borderColor: "#4A342E",
  },

  inputRow: { flexDirection: "row", gap: 8 },
  pixelInput: { flex: 1, backgroundColor: "#FFF", borderWidth: 2, borderColor: "#4A342E", padding: 10, fontSize: 16, color: "#4A342E", fontWeight: "bold" },
  pixelInputEditing: { borderColor: "#3498DB", backgroundColor: "#F4F9FD" },
  addBtn: { backgroundColor: "#F39C12", paddingHorizontal: 15, borderWidth: 2, borderColor: "#4A342E", justifyContent: "center", alignItems: "center" },

  todoItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", padding: 15, borderWidth: 2, borderColor: "#4A342E", marginBottom: 10 },
  todoItemEditing: { borderColor: "#3498DB", borderWidth: 2 },
  todoItemCheckedModal: { borderColor: "#EC7424", backgroundColor: "#FFFDF9" }, // 選中時的復古粗橘框
  todoTextRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  todoText: { fontSize: 16, color: "#4A342E", fontWeight: "bold", flex: 1 },
  todoCompleted: { textDecorationLine: "line-through", color: "#BDC3C7" },

  customCheckbox: { width: 22, height: 22, borderWidth: 2, borderColor: "#4A342E", backgroundColor: "#FFF", justifyContent: "center", alignItems: "center" },
  customCheckboxChecked: { backgroundColor: "#4CAF50" },

  // 🔴 複選選取框樣式（亮橘像素風）
  selectCheckbox: { width: 22, height: 22, borderWidth: 2, borderColor: "#4A342E", backgroundColor: "#FFF", justifyContent: "center", alignItems: "center" },
  selectCheckboxActive: { backgroundColor: "#EC7424" },

  docGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 4, paddingBottom: 120 },
  polaroidCardContainer: { width: "48%", marginBottom: 20, position: "relative" },
  polaroidShadow: { position: "absolute", top: 5, left: 5, right: -5, bottom: -5, backgroundColor: "#5E433B", borderWidth: 2, borderColor: "#5E433B" },
  polaroidCard: { width: "100%", backgroundColor: "#FFF", borderWidth: 2, borderColor: "#5E433B", paddingTop: 12, paddingHorizontal: 12 },
  imageContainer: { width: "100%", aspectRatio: 1, backgroundColor: "#EDE8DC", borderWidth: 1.5, borderColor: "#5E433B" },
  polaroidImage: { width: "100%", height: "100%", resizeMode: "cover" },
  polaroidBottom: { height: 56, justifyContent: "space-between", paddingVertical: 6, backgroundColor: "#FFF" },
  polaroidTitle: { fontSize: 15, fontWeight: "bold", color: "#4A342E" },
  polaroidFooterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  polaroidNote: { fontSize: 12, color: "#8D6E63", height: 16, lineHeight: 16, flex: 1, marginRight: 6 },
  polaroidNoteBlank: { height: 16, flex: 1 },
  fab: { position: "absolute", right: 20, bottom: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: "#EC7424", borderWidth: 3, borderColor: "#5E433B", justifyContent: "center", alignItems: "center", shadowColor: "#5E433B", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4 },
  fullImageOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  fullImage: { width: "95%", height: "80%" },
  fullImageCloseBtn: { position: "absolute", top: 50, right: 30, zIndex: 10 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end", alignItems: "center" },
  keyboardAvoidingView: { width: "100%", justifyContent: "flex-end" },
  modalCardContainerModal: { width: "100%" },
  modalCard: { width: "100%", maxHeight: 520, backgroundColor: "#FDFBF0", borderWidth: 3, borderColor: "#5E433B", borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 40 : 24, paddingTop: 10 },
  dragIndicator: { width: 40, height: 5, backgroundColor: "#5E433B", borderRadius: 2.5, alignSelf: "center", marginBottom: 10 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalTitleInput: { flex: 1, textAlign: "center", fontSize: 16, color: "#5E433B", fontWeight: "bold" },
  modalSeparator: { width: "100%", height: 8, resizeMode: "contain", marginBottom: 12 },
  modalLabel: { fontSize: 14, fontWeight: "bold", color: "#5E433B", marginBottom: 6 },
  imagePickerBox: { width: "100%", height: 150, backgroundColor: "#F3EFE6", borderWidth: 2, borderColor: "#5E433B", justifyContent: "center", alignItems: "center", marginBottom: 14, overflow: "hidden" },
  imagePickerPreview: { width: "100%", height: "100%" },
  imagePickerText: { color: "#5E433B", fontSize: 14, fontWeight: "500" },
  modalNoteInput: { width: "100%", height: 90, backgroundColor: "#F3EFE6", borderWidth: 2, borderColor: "#5E433B", padding: 10, textAlignVertical: "top", fontSize: 14, color: "#5E433B", marginBottom: 16 },
  modalBtnRow: { flexDirection: "row", gap: 14, marginTop: 4 },
  modalBtnContainer: { flex: 1, position: "relative", height: 45 },
  modalBtnShadow: { position: "absolute", top: 4, left: 4, right: -4, bottom: -4, borderRadius: 0 },
  modalBtn: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: "#5E433B", alignItems: "center", justifyContent: "center", borderRadius: 0 },
  modalBtnText: { fontWeight: "bold", fontSize: 14 },

  alertOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  alertCardContainer: { width: "80%", position: "relative" },
  alertCardShadow: { position: "absolute", top: 6, left: 6, right: -6, bottom: -6, backgroundColor: "#5E433B" },
  alertCard: { width: "100%", backgroundColor: "#FDFBF0", borderWidth: 2, borderColor: "#5E433B", padding: 20, alignItems: "center" },
  alertTitle: { fontSize: 18, fontWeight: "bold", color: "#5E433B", marginBottom: 6 },
  alertMessage: { fontSize: 14, color: "#4A342E", textAlign: "center", lineHeight: 20, marginTop: 4, marginBottom: 20 },
});