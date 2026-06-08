import { COLORS } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useGlobalSearchParams } from "expo-router";
import { Check, Plus, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context"; // 定義資料型別
type TodoItem = { id: string; text: string; completed: boolean };
type Document = { id: string; uri: string; title: string; note: string };

export default function BackpackScreen() {
  // 🌟 取得傳過來的冒險 ID
  const route = useRoute<any>();
  const adventureId = route.params?.adventureId || "default_id";
  console.log("🎒 目前的冒險 ID 是：", adventureId);
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
    if (adventureId) {
      loadData();
    }
  }, [adventureId]); // 🌟 把 adventureId 加進陣列，只要 ID 改變就重新抓取對應的資料
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
  // ✅ 換成這個：直接去全域網址抓 ID，保證抓得到！
  const { id } = useGlobalSearchParams<{ id: string }>();
  // --- 🌟 動態產生專屬的儲存 Key ---
  // 如果沒有拿到 adventureId，先給一個預設值防呆
  const TODO_KEY = `@backpack_todos_${adventureId || 'default'}`;
  const DOC_KEY = `@backpack_docs_${adventureId || 'default'}`;

  // --- 資料持久化 ---
  const loadData = async () => {
    try {
      const savedTodos = await AsyncStorage.getItem(TODO_KEY);
      const savedDocs = await AsyncStorage.getItem(DOC_KEY);
      
      // 🌟 每次載入時先清空，確保不會殘留上一個冒險的資料
      setTodos(savedTodos ? JSON.parse(savedTodos) : []);
      setDocuments(savedDocs ? JSON.parse(savedDocs) : []);
    } catch (error) {
      console.error("讀取資料失敗:", error);
    }
  };

  const saveData = async (newTodos: TodoItem[], newDocs: Document[]) => {
    try {
      await AsyncStorage.setItem(TODO_KEY, JSON.stringify(newTodos));
      await AsyncStorage.setItem(DOC_KEY, JSON.stringify(newDocs));
    } catch (error) {
      console.error("儲存資料失敗:", error);
    }
  };

  // --- 清單邏輯 ---
  // --- 清單邏輯 ---
  const handleTodoSubmit = () => {
    if (!newTodo.trim()) return;

    if (editingTodo) {
      const updated = todos.map((t) =>
        t.id === editingTodo.id ? { ...t, text: newTodo.trim() } : t
      );
      setTodos(updated);
      setEditingTodo(null);
      setNewTodo("");
      saveData(updated, documents);
      Keyboard.dismiss(); // 🌟 只有「編輯完成」才收起鍵盤
    } else {
      const updated = [
        ...todos,
        { id: Date.now().toString(), text: newTodo.trim(), completed: false },
      ];
      setTodos(updated);
      setNewTodo("");
      saveData(updated, documents);
      // 🌟 新增狀態下不呼叫 Keyboard.dismiss()，讓鍵盤保持開啟可繼續輸入！
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
          <Pressable style={{ flex: 1 }} onPress={() => switchTab("todo")}>
            {({ pressed }) => (
              <View style={[styles.tab, activeTab === "todo" && styles.activeTab, pressed ? styles.btnPressed : styles.btnShadow]}>
                <Text style={[styles.tabText, activeTab === "todo" && styles.activeTabText]}>
                  準備清單
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable style={{ flex: 1 }} onPress={() => switchTab("wallet")}>
            {({ pressed }) => (
              <View style={[styles.tab, activeTab === "wallet" && styles.activeTab, pressed ? styles.btnPressed : styles.btnShadow]}>
                <Text style={[styles.tabText, activeTab === "wallet" && styles.activeTabText]}>
                  數位證件
                </Text>
              </View>
            )}
          </Pressable>
        </View>
      ) : (
        /* 🔴 複選模式專用頂部工具列 */
        <View style={styles.batchActionHeader}>
          {/* 左側：取消按鈕 (固定寬度與對齊) */}
          <View style={{ flex: 1, alignItems: "flex-start" }}>
            <Pressable onPress={exitSelectMode}>
              {({ pressed }) => (
                <View style={[styles.batchCancelBtn, pressed ? styles.btnPressed : styles.btnShadow]}>
                  <Text style={styles.batchCancelText}>取消</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* 中間：標題 */}
          <Text style={styles.batchTitle}>已選取 {selectedTodoIds.length} 個</Text>

          {/* 右側：丟棄按鈕 (固定寬度與對齊) */}
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Pressable onPress={() => setIsDeleteModalVisible(true)}>
              {({ pressed }) => (
                <View style={[styles.batchDeleteBtn, pressed ? styles.btnPressed : styles.btnShadow]}>

                  <Text style={styles.batchDeleteText}>丟棄</Text>
                </View>
              )}
            </Pressable>
          </View>
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
        <View style={{ width: screenWidth, height: "100%", overflow: "hidden" }}>
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
                  <Pressable
                    key={item.id}
                    onPress={() => handlePressTodo(item)}
                    onLongPress={() => handleLongPressTodo(item)}
                    delayLongPress={600}
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.todoItem,
                          editingTodo?.id === item.id && styles.todoItemEditing,
                          isSelectMode && isSelected && styles.todoItemCheckedModal,
                          pressed ? styles.btnPressedField : styles.btnShadow // 🌟 行程卡按壓效果
                        ]}
                      >
                        <View style={styles.todoTextRow}>
                          {/* 🌟 左側勾勾區域：放大 HitSlop 點擊範圍 */}
                          <TouchableOpacity
                            onPress={() => handleToggleComplete(item)}
                            style={{ padding: 2, paddingHorizontal: 10, marginLeft: -10, marginRight: 2 }}
                            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                          >
                            {isSelectMode ? (
                              /* 🔴 複選模式：維持原本的橘色方框 (若你想連複選都換成同一張圖，也可以套用下方的寫法) */
                              /* 🌟 普通模式：替換為你的自訂像素圖檔 */
                              <Image
                                source={
                                  item.completed
                                    ? require("../../img/icon_check.png") // 打勾時的綠色圖檔
                                    : require("../../img/icon_check.png")       // 未打勾時的空框圖檔
                                }
                                style={{ width: 24, height: 24, resizeMode: "contain" }}
                              />
                            ) : (
                              /* 🌟 普通模式：替換為你的自訂像素圖檔 */
                              <Image
                                source={
                                  item.completed
                                    ? require("../../img/icon_checkActive.png") // 打勾時的綠色圖檔
                                    : require("../../img/icon_check.png")       // 未打勾時的空框圖檔
                                }
                                style={{ width: 24, height: 24, resizeMode: "contain" }}
                              />
                            )}
                          </TouchableOpacity>
                          <Text style={[
                            styles.todoText,
                            item.completed && !isSelectMode && styles.todoCompleted,
                            isSelectMode && isSelected && { color: COLORS.primary }
                          ]}>
                            {item.text}
                          </Text>
                        </View>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {!isSelectMode && (
              <View style={styles.bottomInputContainer}>
                <View style={styles.inputRow}>
                  {/* 輸入框 (靜態陰影) */}
                  <TextInput
                    ref={todoInputRef}
                    style={[styles.pixelInput, styles.btnShadow, editingTodo && styles.pixelInputEditing]}
                    placeholder={editingTodo ? "正在修改裝備..." : "新增裝備..."}
                    placeholderTextColor={COLORS.line2}
                    value={newTodo}
                    onChangeText={setNewTodo}
                    returnKeyType="done"
                    onSubmitEditing={handleTodoSubmit}
                  />

                  {/* 新增/確認按鈕 (動態按壓陰影) */}
                  <Pressable onPress={handleTodoSubmit}>
                    {({ pressed }) => (
                      <View style={[
                        styles.addBtn,
                        editingTodo && { backgroundColor: COLORS.primary },
                        pressed ? styles.btnPressed : styles.btnShadow
                      ]}>
                        {editingTodo ? <Check color="#FFF" size={24} /> : <Plus color="#FFF" size={24} />}
                      </View>
                    )}
                  </Pressable>

                  {/* 取消編輯按鈕 (動態按壓陰影) */}
                  {editingTodo && (
                    <Pressable
                      onPress={() => {
                        setEditingTodo(null);
                        setNewTodo("");
                        Keyboard.dismiss();
                      }}
                    >
                      {({ pressed }) => (
                        <View style={[styles.addBtn, { backgroundColor: COLORS.disable }, pressed ? styles.btnPressed : styles.btnShadow]}>
                          <X color="#FFF" size={24} />
                        </View>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
        <View style={{ width: screenWidth, height: "100%", overflow: "hidden" }}>
          <View style={styles.content}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.docGrid}>
              {documents.map((doc) => (
                <Pressable
                  key={doc.id}
                  onPress={() => openEditModal(doc)}
                  onLongPress={() => handleLongPressDoc(doc)}
                  delayLongPress={600}
                  style={({ pressed }) => [
                    {
                      width: "48%",
                      marginBottom: 20,
                      backgroundColor: "#FFF",
                      borderWidth: 2,
                      borderColor: "#4A342E",
                      padding: 10
                    },
                    pressed ? styles.btnPressedField : styles.btnShadow
                  ]}
                >
                  {/* 圖片容器 */}
                  <View style={{ width: "100%", aspectRatio: 1, backgroundColor: "#FDFBF0", borderWidth: 2, borderColor: "#4A342E", marginBottom: 8 }}>
                    <Image source={{ uri: doc.uri }} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
                  </View>

                  {/* 文字區塊 */}
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: "#4A342E", marginBottom: 4 }} numberOfLines={1}>
                    {doc.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#8D6E63", fontWeight: "bold" }} numberOfLines={1}>
                    {doc.note || " "}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* 🌟 底部加號按鈕 (使用你的自訂雙圖片切換) */}
            <View style={styles.fabContainer}>
              <Pressable onPress={openAddModal}>
                {({ pressed }) => (
                  <View style={pressed ? { transform: [{ translateY: 2 }] } : {}}>
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
            </View>
          </View>
        </View>
      </ScrollView>




      {/* 🌟 滿版由下往上滑出的「新增/編輯數位證件」頁面 (復刻 Adventure) */}
      <Modal visible={isAddModalVisible} transparent={false} animationType="slide">
        <SafeAreaView style={styles.fullPageModalContainer}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>

            {/* 1. 頂部列：返回按鈕 */}
            <TouchableOpacity
              onPress={closeAddModal}
              style={{ width: "100%", paddingHorizontal: 20, paddingTop: Platform.OS === "ios" ? 10 : 20, paddingBottom: 15 }}
            >
              <Image source={require("../../img/icon_chevronLeft.png")} style={{ height: 16, width: 16 }} resizeMode="contain" />
            </TouchableOpacity>

            {/* 2. 中間列：文字輸入框與編輯 Icon */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 20, paddingBottom: 2, width: "100%", position: "relative" }}>
              <TextInput
                style={[styles.pixelTitleInput, { padding: 10, minWidth: 200, fontFamily: "PressStart2P", fontSize: 16, color: "#4A342E" }]}
                placeholder="請在此輸入證件名稱"
                placeholderTextColor="#8D6E63"
                value={modalTitle}
                onChangeText={setModalTitle}
                autoFocus={!editingDoc} // 新增時自動跳出鍵盤
              />
              <Image
                source={require("../../img/icon_edit.png")}
                style={{ height: 16, width: 16, position: "absolute", right: 20, bottom: 14 }}
                resizeMode="contain"
              />
            </View>

            {/* 3. 底部列：波浪底線 */}
            <View style={{ paddingHorizontal: 20, width: "100%", marginBottom: 10 }}>
              <Image source={require("../../img/ad_line.png")} style={{ width: "100%", height: 10, resizeMode: "contain" }} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30, gap: 10 }}
            >
              {/* 圖片區塊 */}
              <Text style={styles.modalLabel}>圖片</Text>
              {!modalImageUri ? (
                <TouchableOpacity style={styles.designAddImageFrame} onPress={pickImageInModal}>
                  <Text style={styles.designAddImageFrameText}>點此上傳圖片+</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.designAddImageFrameActive} onPress={pickImageInModal} activeOpacity={0.9}>
                  <Image
                    source={{ uri: modalImageUri }}
                    // 🌟 關鍵修改：將 resizeMode 改為 "contain" 
                    style={{ width: "100%", height: "100%", resizeMode: "contain" }}
                  />
                </TouchableOpacity>
              )}

              {/* 備註區塊 */}
              <Text style={styles.modalLabel}>備註</Text>
              <TextInput
                style={[styles.pixelInput, styles.pixelTextArea]}
                multiline
                placeholder="請輸入備註..."
                placeholderTextColor="#8D6E63"
                value={modalNote}
                onChangeText={setModalNote}
              />

              {/* 底部按鈕列：cancel & save */}
              <View style={styles.modalPageBtnRow}>
                <Pressable style={{ flex: 1 }} onPress={closeAddModal}>
                  {({ pressed }) => (
                    <View style={[styles.pageCustomBtn, styles.pageCancelBtn, pressed ? styles.btnPressed : styles.btnShadow]}>
                      <Text style={styles.pageCancelBtnText}>cancel</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable style={{ flex: 1 }} onPress={saveDocument}>
                  {({ pressed }) => (
                    <View style={[styles.pageCustomBtn, styles.pageSaveBtn, pressed ? styles.btnPressed : styles.btnShadow]}>
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
        <View style={styles.modalOverlayb}>
          <View style={[styles.modalCardb, { alignItems: "center", height: "auto" }]}>
            <Text style={[styles.pixelTitleInputb, { fontSize: 18 }]}>DELETE?</Text>
            <Text style={{ color: "#8D6E63", fontWeight: "bold" }}>{isSelectMode
              ? "刪除後裝備將無法復原！"
              : "刪除後證件將無法復原！"}</Text>
            {/* 底部按鈕列：cancel & save */}
            <View style={styles.modalPageBtnRowb}>
              <Pressable style={{ flex: 1 }} onPress={() => setIsDeleteModalVisible(false)}>
                {({ pressed }) => (
                  <View style={[styles.pageCustomBtn, styles.pageCancelBtn, pressed ? styles.pageBtnPressed : styles.pageBtnShadow]}>
                    <Text style={styles.pageCancelBtnText}>cancel</Text>
                  </View>
                )}
              </Pressable>

              <Pressable style={{ flex: 1 }} onPress={confirmDelete}>
                {({ pressed }) => (
                  <View style={[styles.pageCustomBtnb, styles.pageSaveBtn, pressed ? styles.pageBtnPressed : styles.pageBtnShadow]}>
                    <Text style={styles.pageCancelBtnText}>OK</Text>
                  </View>
                )}
              </Pressable>
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
  tab: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 10, borderWidth: 2, borderColor: "#4A342E", backgroundColor: "#FFF", gap: 8 }, activeTab: { backgroundColor: COLORS.line2 },
  tabText: { color: "#4A342E", fontWeight: "bold", fontSize: 14 },
  activeTabText: { color: "#FFF" },
  separatorContainer: { marginTop: 10 },
  separator: { width: "100%", height: 10, resizeMode: "contain" },
  content: { flex: 1, padding: 20 },
  // 🌟 核心按壓與陰影系統 (給 Tabs、按鈕、裝備卡片共用)
  btnShadow: {
    borderRightWidth: 2,
    borderBottomWidth: 4,
  },
  btnPressed: {
    transform: [{ translateY: 2 }],
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  btnPressedField: {
    transform: [{ translateY: 2 }],
    borderRightWidth: 2,
    borderBottomWidth: 4,
  },
  // 🔴 全新：複選頂部工具列樣式
  batchActionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    height: 46,
    backgroundColor: COLORS.bg,
  },
  batchTitle: { fontSize: 15, fontWeight: "bold", color: "#4A342E" },
  batchCancelText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },
  batchDeleteText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },
  batchCancelBtn: { width: 80, alignItems: "center", paddingVertical: 8, borderWidth: 2, borderColor: "#4A342E", backgroundColor: COLORS.disable },
  batchDeleteBtn: { width: 80, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, borderWidth: 2, borderColor: "#4A342E", backgroundColor: COLORS.primary },
  contentTodoContainer: { flex: 1 },
  todoListScroll: { flex: 1, paddingHorizontal: 20, paddingTop: 15 },
  bottomInputContainer: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    borderTopWidth: 2,
    borderColor: "#4A342E",
  },

  inputRow: { flexDirection: "row", gap: 8 },
  pixelInput: { flex: 1, backgroundColor: "#FFF", borderWidth: 2, borderColor: "#4A342E", padding: 10, fontSize: 14, color: "#4A342E", fontWeight: "bold" },
  pixelInputEditing: { borderColor: COLORS.primary, backgroundColor: "#F4F9FD" },
  addBtn: { width: 50, height: 50, backgroundColor: COLORS.primary, borderWidth: 2, borderColor: "#4A342E", justifyContent: "center", alignItems: "center" },
  todoItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", padding: 15, borderWidth: 2, borderColor: "#4A342E", marginBottom: 10 },
  todoItemEditing: { borderColor: COLORS.primary, borderWidth: 2 },
  todoItemCheckedModal: { borderColor: COLORS.primary, backgroundColor: "#FFFDF9" }, // 選中時的復古粗橘框
  todoTextRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  todoText: { fontSize: 16, color: "#4A342E", fontWeight: "bold", flex: 1 },
  todoCompleted: { textDecorationLine: "line-through", color: COLORS.disable },

  // 🔴 複選選取框樣式（亮橘像素風）
  selectCheckbox: { width: 22, height: 22, borderWidth: 2, borderColor: "#4A342E", backgroundColor: "#FFF", justifyContent: "center", alignItems: "center" },
  selectCheckboxActive: { backgroundColor: COLORS.primary },

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
  fullImageOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  fullImage: { width: "95%", height: "80%" },
  fullImageCloseBtn: { position: "absolute", top: 50, right: 30, zIndex: 10 },
  // 🌟 將原本的 fab 樣式替換成這兩個
  // 🌟 更新 FAB 樣式，拔除原本的框線與背景色，完全交給圖片顯示
  fabContainer: { position: "absolute", right: 20, bottom: 30 },
  fabIcon: {
    width: 60,  // 👈 這裡的大小你可以依照你的圖檔比例微調 (例如 60~70)
    height: 60,
    resizeMode: "contain"
  },
  fabIconAbsolute: {
    position: "absolute",
    top: -2,
    left: 0
  }, fab: {
    width: 60,
    height: 60,
    backgroundColor: "#EC7424",
    borderWidth: 2,
    borderColor: "#4A342E",
    justifyContent: "center",
    alignItems: "center"
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end", alignItems: "center" },
  modalOverlayb: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardAvoidingView: { width: "100%", justifyContent: "flex-end" },
  modalCardContainerModal: { width: "100%" },
  modalCard: { width: "100%", maxHeight: 520, backgroundColor: "#FDFBF0", borderWidth: 3, borderColor: "#5E433B", borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 40 : 24, paddingTop: 10 },
  modalCardb: {
    width: "90%",
    backgroundColor: "#FFFDF9",
    borderWidth: 3,
    borderColor: "#5E433B",
    padding: 20,
    borderRadius: 10,
    height: 550,
    overflow: "hidden",
  },
  dragIndicator: { width: 40, height: 5, backgroundColor: "#5E433B", borderRadius: 2.5, alignSelf: "center", marginBottom: 10 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  modalTitleInput: { flex: 1, textAlign: "center", fontSize: 16, color: "#5E433B", fontWeight: "bold" },
  modalSeparator: { width: "100%", height: 8, resizeMode: "contain", marginBottom: 12 },
  imagePickerBox: { width: "100%", height: 150, backgroundColor: "#F3EFE6", borderWidth: 2, borderColor: "#5E433B", justifyContent: "center", alignItems: "center", marginBottom: 14, overflow: "hidden" },
  imagePickerPreview: { width: "100%", height: "100%" },
  imagePickerText: { color: "#5E433B", fontSize: 14, fontWeight: "500" },
  modalNoteInput: { width: "100%", height: 90, backgroundColor: "#F3EFE6", borderWidth: 2, borderColor: "#5E433B", padding: 10, textAlignVertical: "top", fontSize: 14, color: "#5E433B", marginBottom: 16 },
  modalBtnRow: { flexDirection: "row", gap: 14, marginTop: 4 },
  modalBtnContainer: { flex: 1, position: "relative", height: 45 },
  modalBtnShadow: { position: "absolute", top: 4, left: 4, right: -4, bottom: -4, borderRadius: 0 },
  modalBtn: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: "#5E433B", alignItems: "center", justifyContent: "center", borderRadius: 0 },
  modalBtnText: { fontWeight: "bold", fontSize: 14 },

  // --- 🌟 滿版編輯 Modal (復刻 Adventure) 專用樣式 ---
  fullPageModalContainer: { flex: 1, backgroundColor: COLORS.bg },
  pixelTitleInput: { textAlign: "center", fontWeight: "bold" },
  pixelTitleInputb: {
    fontFamily: "PressStart2P",
    fontSize: 16,
    color: "#5E433B",
    textAlign: "center",
    padding: 10,
  },
  modalLabel: { fontSize: 14, fontWeight: "bold", color: "#4A342E", marginBottom: 6, marginTop: 10 },
  designAddImageFrameText: { fontSize: 14, color: "#8D6E63", fontWeight: "bold" },
  pixelTextArea: { height: 90, textAlignVertical: "top" },
  // ... 其他樣式保留

  designAddImageFrame: { width: "100%", height: 110, borderWidth: 2, borderColor: "#4A342E", backgroundColor: "#FFF", justifyContent: "center", alignItems: "center" },

  // 🌟 將 Active 狀態的框框改成「左右撐滿、高度自動等比例放大」
  designAddImageFrameActive: {
    width: "100%",
    aspectRatio: 1, // 變成完美的 1:1 正方形，超級大！
    borderWidth: 2,
    borderColor: "#4A342E",
    backgroundColor: COLORS.bg2,
    overflow: "hidden", // 確保圖片不會超出粗框的圓角或邊界
  },

  // ... 其餘往下保留
  modalPageBtnRow: { flexDirection: "row", gap: 16, marginTop: 28, paddingBottom: 10 },
  modalPageBtnRowb: {
    flexDirection: "row",
    gap: 16,
    marginTop: 28,
    paddingBottom: 10,
  },
  pageCustomBtn: { borderWidth: 2, borderColor: "#4A342E", paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  pageCustomBtnb: {
    borderWidth: 2,
    borderColor: "#4A342E",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pageCancelBtn: { backgroundColor: COLORS.disable },
  pageSaveBtn: { backgroundColor: COLORS.primary },
  pageCancelBtnText: {
    fontSize: 14, color: "#FFFFFF", fontFamily: "PressStart2P", textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  pageSaveBtnText: {
    fontSize: 14, color: "#FFFFFF", fontFamily: "PressStart2P", textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  pageCancelBtnTextb: {
    fontFamily: "PressStart2P",
    fontSize: 14,
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  pageSaveBtnTextb: {
    fontFamily: "PressStart2P",
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  // --- 🌟 刪除確認視窗 (完全還原圖片風格) ---
  alertOverlay: { flex: 1, backgroundColor: "rgba(30, 25, 22, 0.85)", justifyContent: "center", alignItems: "center" },
  alertCardContainer: { width: "85%", alignSelf: "center", position: "relative" },
  alertCardShadow: { position: "absolute", top: 6, left: 6, right: -6, bottom: -6, backgroundColor: "#362A25" }, // 極深咖啡色底影
  alertCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: "#362A25",
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: "center"
  },

  // 標題與文字
  alertTitlePixel: {
    fontFamily: "PressStart2P", // 💡 若專案有像素字體請解除註解這行
    fontSize: 24,
    fontWeight: "900",
    color: "#5E433B",
    letterSpacing: 2,
    marginBottom: 6
  },
  alertMessageText: {
    fontSize: 15,
    color: "#8D6E63",
    fontWeight: "bold",
    marginBottom: 25,
    textAlign: "center"
  },

  // 按鈕排版與外觀
  alertBtnRow: { flexDirection: "row", gap: 15, width: "100%" },
  alertCancelBtn: {
    backgroundColor: "#C2D1BC", // 圖片的淺綠色
    borderWidth: 3,
    borderColor: "#362A25",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  alertOkBtn: {
    backgroundColor: "#EC7424", // 圖片的橘色
    borderWidth: 3,
    borderColor: "#362A25",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center"
  },

  // 按鈕專屬動態陰影
  alertBtnShadow: { borderRightWidth: 3, borderBottomWidth: 5 },
  alertBtnPressed: { transform: [{ translateY: 3 }], borderRightWidth: 3, borderBottomWidth: 2 },

  // 按鈕文字
  alertBtnTextPixel: {
    fontFamily: "PressStart2P", // 💡 若專案有像素字體請解除註解這行
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1
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
});