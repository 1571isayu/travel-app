import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { ChevronDown, ChevronRight, Plus } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebaseConfig";

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = { id: string; name: string; avatar?: string };

type Split = { memberId: string; amount: number };

type Transaction = {
  id: string;
  currency: string;
  amount: number; // 原幣金額
  twd: number; // 換算後台幣
  datetime: string; // "YYYY.MM.DD HH:MM"
  item: string;
  payerId: string;
  splits: Split[];
  imageUri?: string;
  note?: string;
};

type DebtEntry = { fromId: string; toId: string; amount: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = ["TWD", "JPY", "USD", "EUR", "KRW", "HKD", "THB"];

/** 1 單位外幣 → 台幣參考匯率 */
const RATES: Record<string, number> = {
  TWD: 1,
  JPY: 0.215,
  USD: 32.2,
  EUR: 35.1,
  KRW: 0.024,
  HKD: 4.12,
  THB: 0.91,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toTWD = (amount: number, currency: string): number =>
  Math.round(amount * (RATES[currency] ?? 1));

const fmtDatetime = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * 將所有交易算出兩兩之間的淨欠款（已化簡）。
 * 例：A 欠 B 200，B 欠 A 50 → A 欠 B 150
 */
const calcDebts = (txs: Transaction[], members: Member[]): DebtEntry[] => {
  const net: Record<string, Record<string, number>> = {};
  members.forEach((m) => {
    net[m.id] = {};
    members.forEach((n) => {
      if (m.id !== n.id) net[m.id][n.id] = 0;
    });
  });

  txs.forEach((tx) => {
    tx.splits.forEach((s) => {
      if (s.memberId === tx.payerId) return;
      if (!net[s.memberId]) net[s.memberId] = {};
      net[s.memberId][tx.payerId] =
        (net[s.memberId][tx.payerId] || 0) + s.amount;
    });
  });

  const debts: DebtEntry[] = [];
  const seen = new Set<string>();

  Object.keys(net).forEach((a) => {
    Object.keys(net[a] || {}).forEach((b) => {
      const key = [a, b].sort().join("|");
      if (seen.has(key)) return;
      seen.add(key);
      const ab = net[a]?.[b] || 0;
      const ba = net[b]?.[a] || 0;
      const diff = ab - ba;
      if (diff > 0.5)
        debts.push({ fromId: a, toId: b, amount: Math.round(diff) });
      else if (diff < -0.5)
        debts.push({ fromId: b, toId: a, amount: Math.round(-diff) });
    });
  });

  return debts;
};

// ─── Avatar Component ─────────────────────────────────────────────────────────

function Avatar({ member, size = 44 }: { member: Member; size?: number }) {
  const style = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 2,
    borderColor: "#5E433B",
  } as const;

  if (member.avatar) {
    return <Image source={{ uri: member.avatar }} style={style} />;
  }
  return (
    <View style={[style, mainStyles.avatarFallback]}>
      <Text style={[mainStyles.avatarInitial, { fontSize: size * 0.38 }]}>
        {member.name?.[0] ?? "?"}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WalletScreen() {
  const { id } = useLocalSearchParams();

  const [activeTab, setActiveTab] = useState<"debt" | "details">("details");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!id) {
      console.log(
        "❌ 錯誤：找不到冒險 ID (useLocalSearchParams 拿到的 id 為空)",
      );
      return;
    }

    console.log("🚀 開始載入冒險 ID:", id);

    // 1. 載入成員（修正欄位對照 + 加上錯誤捕捉）
    const membersUnsub = onSnapshot(
      collection(db, "adventures", id as string, "members"),
      async (snap) => {
        const firebaseMembers: Member[] = [];
        snap.forEach((d) =>
          firebaseMembers.push({
            id: d.id,
            ...(d.data() as Omit<Member, "id">),
          }),
        );

        if (firebaseMembers.length > 0) {
          setMembers(firebaseMembers);
        } else {
          // Fallback：從本機讀取當前使用者
          try {
            const stored = await AsyncStorage.getItem("@user_profile");
            if (stored) {
              const p = JSON.parse(stored);
              console.log("📝 讀取到本機 Profile:", p);
              setMembers([
                {
                  id: p.uid || "me",
                  name: p.displayName || p.name || "我", // 💡 同時相容 displayName 和 name
                  avatar: p.photoURL || p.avatar, // 💡 同時相容 photoURL 和 avatar
                },
              ]);
            } else {
              setMembers([{ id: p.uid || "me", name: "我" }]);
            }
          } catch (err) {
            console.error("讀取 AsyncStorage 失敗:", err);
            setMembers([{ id: "me", name: "我" }]);
          }
        }
      },
      (error) => {
        console.error("❌ 成員監聽失敗 (請檢查安全性規則):", error);
      },
    );

    // 2. 載入交易（加上錯誤捕捉，避免卡死在轉圈圈）
    const txQuery = query(
      collection(db, "adventures", id as string, "transactions"),
      orderBy("createdAt", "desc"),
    );

    const txUnsub = onSnapshot(
      txQuery,
      (snap) => {
        const list: Transaction[] = [];
        snap.forEach((d) =>
          list.push({ id: d.id, ...(d.data() as Omit<Transaction, "id">) }),
        );
        setTransactions(list);
        setLoading(false); // 成功讀取，關閉轉圈圈
        console.log(`✅ 交易載入成功，共 ${list.length} 筆`);
      },
      (error) => {
        // 💡 如果卡轉圈圈，通常是這裡噴錯（例如缺少 Index）
        console.error(
          "❌ 交易監聽失敗！原因可能是缺少 Firestore 複合索引或權限不足:",
          error,
        );
        setLoading(false); // 就算失敗也強迫關閉轉圈圈，你才能看到畫面提示
      },
    );

    return () => {
      membersUnsub();
      txUnsub();
    };
  }, [id]);

  const getMember = (mid: string): Member =>
    members.find((m) => m.id === mid) ?? { id: mid, name: "?" };

  const debts = calcDebts(transactions, members);

  if (loading) {
    return (
      <View style={mainStyles.loading}>
        <ActivityIndicator size="large" color="#5E433B" />
      </View>
    );
  }

  return (
    <View style={mainStyles.container}>
      {/* ── Tab Bar ── */}
      <View style={mainStyles.tabRow}>
        {(["debt", "details"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[mainStyles.tab, activeTab === tab && mainStyles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                mainStyles.tabText,
                activeTab === tab && mainStyles.tabTextActive,
              ]}
            >
              {tab === "debt" ? "DEBT" : "DETAILS"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Image
        source={require("../../img/ad_line.png")}
        style={mainStyles.separator}
      />

      {/* ── DETAILS Tab ── */}
      {activeTab === "details" && (
        <ScrollView
          style={mainStyles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={mainStyles.scrollContent}
        >
          {transactions.length === 0 ? (
            <View style={mainStyles.empty}>
              <Text style={mainStyles.emptyTitle}>還沒有任何記帳紀錄</Text>
              <Text style={mainStyles.emptySub}>點右下角 + 開始新增！</Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const payer = getMember(tx.payerId);
              const displayAmt =
                tx.currency !== "TWD"
                  ? `$${tx.currency}${tx.amount}`
                  : `$NT${tx.twd}`;
              return (
                <View key={tx.id} style={mainStyles.txCard}>
                  {/* 左：付款人頭像 + 名字 */}
                  <View style={mainStyles.txLeft}>
                    <Avatar member={payer} size={46} />
                    <Text style={mainStyles.txPayerName} numberOfLines={1}>
                      {payer.name}
                    </Text>
                  </View>

                  {/* 中：品項 + 日期 */}
                  <View style={mainStyles.txMiddle}>
                    <Text style={mainStyles.txItem} numberOfLines={1}>
                      {tx.item || "未命名"}
                    </Text>
                    <Text style={mainStyles.txDate}>{tx.datetime}</Text>
                  </View>

                  {/* 右：金額 + 硬幣 */}
                  <View style={mainStyles.txRight}>
                    <Text style={mainStyles.txAmount}>{displayAmt}</Text>
                    <Text style={mainStyles.txCoin}>🪙</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── DEBT Tab ── */}
      {activeTab === "debt" && (
        <ScrollView
          style={mainStyles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={mainStyles.scrollContent}
        >
          {debts.length === 0 ? (
            <View style={mainStyles.empty}>
              <Text style={mainStyles.emptyTitle}>🎉 目前沒有待結清的欠款</Text>
            </View>
          ) : (
            debts.map((debt, i) => {
              const from = getMember(debt.fromId);
              const to = getMember(debt.toId);
              return (
                <View key={i} style={mainStyles.debtCard}>
                  {/* 欠款人 */}
                  <View style={mainStyles.debtPerson}>
                    <Avatar member={from} size={54} />
                    <Text style={mainStyles.debtName} numberOfLines={1}>
                      {from.name}
                    </Text>
                  </View>

                  {/* 金額 + 箭頭 */}
                  <View style={mainStyles.debtMiddle}>
                    <Text style={mainStyles.debtAmount}>
                      ${`NT${debt.amount}`}
                    </Text>
                    <ChevronRight color="#5E433B" size={20} />
                  </View>

                  {/* 被欠人 */}
                  <View style={mainStyles.debtPerson}>
                    <Avatar member={to} size={54} />
                    <Text style={mainStyles.debtName} numberOfLines={1}>
                      {to.name}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── FAB ── */}
      <TouchableOpacity style={mainStyles.fab} onPress={() => setShowAdd(true)}>
        <Plus color="#FFF" size={28} />
      </TouchableOpacity>

      {/* ── Add Transaction Modal ── */}
      {showAdd && (
        <AddTransactionModal
          visible={showAdd}
          members={members}
          adventureId={id as string}
          onClose={() => setShowAdd(false)}
        />
      )}
    </View>
  );
}

// ─── Add Transaction Modal ────────────────────────────────────────────────────

function AddTransactionModal({
  visible,
  members,
  adventureId,
  onClose,
}: {
  visible: boolean;
  members: Member[];
  adventureId: string;
  onClose: () => void;
}) {
  const [currency, setCurrency] = useState("TWD");
  const [amountStr, setAmountStr] = useState("");
  const [datetime, setDatetime] = useState(fmtDatetime(new Date()));
  const [item, setItem] = useState("");
  const [payerId, setPayerId] = useState(members[0]?.id ?? "");
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  /** equal 模式：已勾選的成員 id 集合 */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(members.map((m) => m.id)),
  );
  /** custom 模式：每人自訂金額字串 */
  const [customAmts, setCustomAmts] = useState<Record<string, string>>({});
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showPayerPicker, setShowPayerPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // 同步成員清單
  useEffect(() => {
    setSelectedIds(new Set(members.map((m) => m.id)));
    setPayerId(members[0]?.id ?? "");
    setCustomAmts(Object.fromEntries(members.map((m) => [m.id, ""])));
  }, [members]);

  const twdTotal = toTWD(parseFloat(amountStr) || 0, currency);
  const selectedCount = selectedIds.size;
  const equalPerPerson =
    selectedCount > 0 ? Math.round(twdTotal / selectedCount) : 0;

  const reset = () => {
    setCurrency("TWD");
    setAmountStr("");
    setDatetime(fmtDatetime(new Date()));
    setItem("");
    setPayerId(members[0]?.id ?? "");
    setSplitMode("equal");
    setSelectedIds(new Set(members.map((m) => m.id)));
    setCustomAmts(Object.fromEntries(members.map((m) => [m.id, ""])));
    setImageUri(null);
    setNote("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  };

  const toggleMember = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    const rawAmt = parseFloat(amountStr);
    if (!rawAmt || rawAmt <= 0) {
      Alert.alert("請輸入金額");
      return;
    }
    if (!item.trim()) {
      Alert.alert("請輸入品項名稱");
      return;
    }
    if (!payerId) {
      Alert.alert("請選擇付款人");
      return;
    }

    let splits: Split[];
    if (splitMode === "equal") {
      if (selectedIds.size === 0) {
        Alert.alert("請至少選擇一位分帳成員");
        return;
      }
      splits = Array.from(selectedIds).map((mid) => ({
        memberId: mid,
        amount: equalPerPerson,
      }));
    } else {
      splits = members
        .map((m) => ({
          memberId: m.id,
          amount: parseFloat(customAmts[m.id] || "0") || 0,
        }))
        .filter((s) => s.amount > 0);
      if (splits.length === 0) {
        Alert.alert("請輸入至少一位成員的金額");
        return;
      }
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "adventures", adventureId, "transactions"), {
        currency,
        amount: rawAmt,
        twd: twdTotal,
        datetime,
        item: item.trim(),
        payerId,
        splits,
        imageUri: imageUri ?? null,
        note: note.trim(),
        createdAt: serverTimestamp(),
      });
      handleClose();
    } catch (e) {
      Alert.alert("儲存失敗", "請稍後再試");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const payer = members.find((m) => m.id === payerId);

  return (
    <Modal visible={visible} animationType="slide">
      <View style={addStyles.container}>
        {/* ── Header：返回 + 貨幣 + 金額 ── */}
        <View style={addStyles.header}>
          <TouchableOpacity onPress={handleClose} style={addStyles.backBtn}>
            <Text style={addStyles.backText}>{"<"}</Text>
          </TouchableOpacity>

          <View style={addStyles.amountRow}>
            <TouchableOpacity
              style={addStyles.currencyBox}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <Text style={addStyles.currencyText}>{currency}</Text>
              <ChevronDown color="#5E433B" size={13} />
            </TouchableOpacity>
            <Text style={addStyles.dollarSign}>$</Text>
            <TextInput
              style={addStyles.amountInput}
              value={amountStr}
              onChangeText={setAmountStr}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#C8B8A2"
            />
            {currency !== "TWD" && twdTotal > 0 && (
              <Text style={addStyles.convertedHint}>≈ NT${twdTotal}</Text>
            )}
          </View>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            style={addStyles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 時間 */}
            <Text style={addStyles.label}>時間</Text>
            <TextInput
              style={addStyles.field}
              value={datetime}
              onChangeText={setDatetime}
              placeholder="YYYY.MM.DD HH:MM"
              placeholderTextColor="#C8B8A2"
            />

            {/* 品項 */}
            <Text style={addStyles.label}>品項</Text>
            <TextInput
              style={addStyles.field}
              value={item}
              onChangeText={setItem}
              placeholder="請輸入名稱"
              placeholderTextColor="#C8B8A2"
            />

            {/* 付款人 */}
            <Text style={addStyles.label}>付款人</Text>
            <TouchableOpacity
              style={addStyles.dropdown}
              onPress={() => setShowPayerPicker(true)}
            >
              <Text
                style={[
                  addStyles.dropdownText,
                  !payerId && addStyles.placeholder,
                ]}
              >
                {payer ? payer.name : "請選擇成員"}
              </Text>
              <ChevronDown color="#5E433B" size={16} />
            </TouchableOpacity>

            {/* 替誰付錢 */}
            <View style={addStyles.splitHeader}>
              <Text style={addStyles.label}>替誰付錢</Text>
              <TouchableOpacity
                style={addStyles.splitToggle}
                onPress={() =>
                  setSplitMode((m) => (m === "equal" ? "custom" : "equal"))
                }
              >
                <Text style={addStyles.splitToggleText}>
                  {splitMode === "equal" ? "金額分配" : "平均分配"}
                </Text>
                <ChevronRight color="#EC7424" size={14} />
              </TouchableOpacity>
            </View>

            <View style={addStyles.splitList}>
              {members.map((m) => {
                const isSelected = selectedIds.has(m.id);
                const displayAmt =
                  splitMode === "equal"
                    ? isSelected
                      ? `$ ${equalPerPerson}`
                      : "—"
                    : undefined;

                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      addStyles.splitItem,
                      splitMode === "equal" &&
                        !isSelected &&
                        addStyles.splitItemDim,
                    ]}
                    onPress={() => splitMode === "equal" && toggleMember(m.id)}
                    activeOpacity={splitMode === "equal" ? 0.7 : 1}
                  >
                    <Avatar member={m} size={36} />
                    <Text style={addStyles.splitName}>{m.name}</Text>
                    {splitMode === "equal" ? (
                      <Text style={addStyles.splitAmt}>{displayAmt}</Text>
                    ) : (
                      <TextInput
                        style={addStyles.splitCustomInput}
                        value={customAmts[m.id] ?? ""}
                        onChangeText={(v) =>
                          setCustomAmts((prev) => ({ ...prev, [m.id]: v }))
                        }
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="#C8B8A2"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 圖片 */}
            <Text style={addStyles.label}>圖片</Text>
            <TouchableOpacity style={addStyles.imagePicker} onPress={pickImage}>
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={addStyles.imagePreview}
                  resizeMode="cover"
                />
              ) : null}
            </TouchableOpacity>

            {/* 備註 */}
            <Text style={addStyles.label}>備註</Text>
            <TextInput
              style={[
                addStyles.field,
                { height: 50, textAlignVertical: "top" },
              ]}
              value={note}
              onChangeText={setNote}
              multiline
            />

            {/* Save 按鈕 */}
            <TouchableOpacity
              style={addStyles.saveBtn}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={addStyles.saveBtnText}>save</Text>
              )}
            </TouchableOpacity>

            <View style={{ height: 50 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── 貨幣選擇 Sheet ── */}
        <Modal visible={showCurrencyPicker} transparent animationType="slide">
          <TouchableOpacity
            style={sheetStyles.overlay}
            onPress={() => setShowCurrencyPicker(false)}
          >
            <View style={sheetStyles.sheet}>
              <Text style={sheetStyles.sheetTitle}>選擇貨幣</Text>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={sheetStyles.option}
                  onPress={() => {
                    setCurrency(c);
                    setShowCurrencyPicker(false);
                  }}
                >
                  <Text style={sheetStyles.optionCurrency}>{c}</Text>
                  <Text style={sheetStyles.optionRate}>
                    {c === "TWD" ? "基準貨幣" : `1 ${c} ≈ NT$ ${RATES[c]}`}
                  </Text>
                  {c === currency && (
                    <Text style={sheetStyles.optionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── 付款人選擇 Sheet ── */}
        <Modal visible={showPayerPicker} transparent animationType="slide">
          <TouchableOpacity
            style={sheetStyles.overlay}
            onPress={() => setShowPayerPicker(false)}
          >
            <View style={sheetStyles.sheet}>
              <Text style={sheetStyles.sheetTitle}>選擇付款人</Text>
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={sheetStyles.option}
                  onPress={() => {
                    setPayerId(m.id);
                    setShowPayerPicker(false);
                  }}
                >
                  <Avatar member={m} size={36} />
                  <Text
                    style={[
                      sheetStyles.optionCurrency,
                      m.id === payerId && sheetStyles.optionSelected,
                    ]}
                  >
                    {m.name}
                  </Text>
                  {m.id === payerId && (
                    <Text style={sheetStyles.optionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const mainStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFBF0",
    paddingTop: 60,
    position: "relative",
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FDFBF0",
  },

  // Tab
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#5E433B",
    backgroundColor: "#FDFBF0",
  },
  tabActive: { backgroundColor: "#5E433B" },
  tabText: { fontSize: 14, fontWeight: "bold", color: "#5E433B" },
  tabTextActive: { color: "#FDFBF0" },

  separator: {
    width: "100%",
    height: 10,
    resizeMode: "contain",
    marginBottom: 4,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // DETAILS card
  txCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 12,
    marginBottom: 12,
  },
  txLeft: { alignItems: "center", width: 58, marginRight: 10 },
  txPayerName: {
    fontSize: 10,
    color: "#5E433B",
    fontWeight: "bold",
    marginTop: 4,
    textAlign: "center",
  },
  txMiddle: { flex: 1 },
  txItem: { fontSize: 14, fontWeight: "bold", color: "#5E433B" },
  txDate: { fontSize: 11, color: "#8D6E63", marginTop: 3 },
  txRight: { alignItems: "flex-end", gap: 4 },
  txAmount: { fontSize: 13, fontWeight: "bold", color: "#5E433B" },
  txCoin: { fontSize: 18 },

  // DEBT card
  debtCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 16,
    marginBottom: 12,
  },
  debtPerson: { alignItems: "center", width: 80 },
  debtName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#5E433B",
    marginTop: 5,
    textAlign: "center",
  },
  debtMiddle: { flexDirection: "row", alignItems: "center", gap: 2 },
  debtAmount: { fontSize: 15, fontWeight: "bold", color: "#5E433B" },

  // Avatar fallback
  avatarFallback: {
    backgroundColor: "#E8DDD5",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: { fontWeight: "bold", color: "#5E433B" },

  // Empty
  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: "bold", color: "#5E433B" },
  emptySub: { fontSize: 13, color: "#8D6E63", marginTop: 8 },

  // FAB
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
    elevation: 10,
    zIndex: 100,
    shadowColor: "#5E433B",
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
});

const addStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFBF0", paddingTop: 56 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8DDD5",
  },
  backBtn: { marginRight: 16, paddingRight: 8 },
  backText: { fontSize: 22, color: "#5E433B", fontWeight: "bold" },
  amountRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  currencyBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#5E433B",
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
  },
  currencyText: { fontSize: 13, fontWeight: "bold", color: "#5E433B" },
  dollarSign: { fontSize: 24, fontWeight: "bold", color: "#5E433B" },
  amountInput: { flex: 1, fontSize: 32, fontWeight: "bold", color: "#5E433B" },
  convertedHint: {
    fontSize: 12,
    color: "#8D6E63",
    alignSelf: "flex-end",
    marginBottom: 4,
  },

  scroll: { flex: 1, paddingHorizontal: 20 },

  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#5E433B",
    marginTop: 18,
    marginBottom: 7,
  },
  field: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#C8B8A2",
    padding: 12,
    fontSize: 14,
    color: "#5E433B",
  },
  placeholder: { color: "#C8B8A2" },

  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#C8B8A2",
    padding: 12,
  },
  dropdownText: { fontSize: 14, color: "#5E433B" },

  // Split section
  splitHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 7,
  },
  splitToggle: { flexDirection: "row", alignItems: "center", gap: 2 },
  splitToggleText: { fontSize: 12, color: "#EC7424", fontWeight: "bold" },

  splitList: {
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#C8B8A2",
  },
  splitItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EBE3",
  },
  splitItemDim: { opacity: 0.35 },
  splitName: { flex: 1, fontSize: 14, fontWeight: "bold", color: "#5E433B" },
  splitAmt: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#5E433B",
    minWidth: 64,
    textAlign: "right",
  },
  splitCustomInput: {
    borderWidth: 1.5,
    borderColor: "#C8B8A2",
    padding: 8,
    fontSize: 14,
    color: "#5E433B",
    minWidth: 80,
    textAlign: "right",
  },

  // Image
  imagePicker: {
    width: "100%",
    height: 100,
    backgroundColor: "#FFF",
    borderWidth: 1.5,
    borderColor: "#C8B8A2",
    overflow: "hidden",
  },
  imagePreview: { width: "100%", height: "100%" },

  // Save
  saveBtn: {
    backgroundColor: "#EC7424",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});

const sheetStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FDFBF0",
    borderTopWidth: 3,
    borderTopColor: "#5E433B",
    padding: 24,
    paddingBottom: 44,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#5E433B",
    textAlign: "center",
    marginBottom: 18,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E8DDD5",
  },
  optionCurrency: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#5E433B",
    flex: 1,
  },
  optionRate: { fontSize: 12, color: "#8D6E63" },
  optionSelected: { color: "#EC7424" },
  optionCheck: { fontSize: 16, color: "#EC7424", fontWeight: "bold" },
});
