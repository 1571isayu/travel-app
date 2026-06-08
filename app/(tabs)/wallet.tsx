import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  deleteDoc as fsDeleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { ChevronDown, ChevronRight, Plus } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebaseConfig";

import { COLORS } from "@/constants/theme";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

type Member = { id: string; name: string; avatar?: string };

type Split = { memberId: string; amount: number };

type Transaction = {
  id: string;
  currency: string;
  amount: number;
  twd: number;
  datetime: string;
  item: string;
  payerId: string;
  splits: Split[];
  imageUri?: string;
  note?: string;
};

type DebtEntry = { fromId: string; toId: string; amount: number };

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = ["TWD", "JPY", "USD", "EUR", "KRW", "HKD", "THB"];

const FALLBACK_RATES: Record<string, number> = {
  TWD: 1,
  JPY: 0.215,
  USD: 32.2,
  EUR: 35.1,
  KRW: 0.024,
  HKD: 4.12,
  THB: 0.91,
};

const WEEKDAYS_ZH = ["日", "一", "二", "三", "四", "五", "六"];
const MONTHS_ZH = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月"
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toTWD = (
  amount: number,
  currency: string,
  rates: Record<string, number> = FALLBACK_RATES,
): number => Math.round(amount * (rates[currency] ?? 1));

const fmtDatetime = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

const fmtDate = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
};

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
  const { id: paramId } = useLocalSearchParams();
  const horizontalScrollRef = useRef<ScrollView>(null);

  const [activeTab, setActiveTab] = useState<"debt" | "details">("details");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [liveRates, setLiveRates] = useState<Record<string, number>>(FALLBACK_RATES);
  const [adventureId, setAdventureId] = useState<string>("");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  useEffect(() => {
    let membersUnsub: () => void = () => { };
    let txUnsub: () => void = () => { };

    const startListening = (resolvedId: string) => {
      setAdventureId(resolvedId);
      membersUnsub = onSnapshot(doc(db, "adventures", resolvedId), async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const membersArray: any[] = data.members || [];
          if (membersArray.length > 0) {
            setMembers(membersArray.map((m) => ({ id: m.uid || m.id, name: m.name || m.displayName, avatar: m.avatar || m.photoURL })));
            return;
          }
        }
      });

      const txQuery = query(collection(db, "adventures", resolvedId, "transactions"), orderBy("createdAt", "desc"));
      txUnsub = onSnapshot(txQuery, (snap) => {
        const list: Transaction[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Transaction, "id">) }));
        setTransactions(list);
        setLoading(false);
      });
    };

    if (paramId) startListening(paramId as string);
    else AsyncStorage.getItem("@current_adventure_id").then((id) => id ? startListening(id) : setLoading(false));

    return () => { membersUnsub(); txUnsub(); };
  }, [paramId]);

  // --- 滑動切換控制 ---
  const handleTabPress = (tab: "debt" | "details") => {
    setActiveTab(tab);
    horizontalScrollRef.current?.scrollTo({
      x: tab === "debt" ? 0 : SCREEN_WIDTH,
      animated: true,
    });
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    setActiveTab(offsetX < SCREEN_WIDTH / 2 ? "debt" : "details");
  };

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/TWD");
        const data = await res.json();
        if (data.result === "success" && data.rates) {
          const r = data.rates as Record<string, number>;
          const updated: Record<string, number> = { TWD: 1 };
          CURRENCIES.forEach((c) => {
            if (c !== "TWD" && r[c]) {
              updated[c] = Math.round((1 / r[c]) * 10000) / 10000;
            }
          });
          setLiveRates(updated);
        }
      } catch (err) {
        console.warn("⚠️ 即時匯率抓取失敗，使用備用匯率:", err);
      }
    };
    fetchRates();
  }, []);

  const getMember = (mid: string): Member =>
    members.find((m) => m.id === mid) ?? { id: mid, name: "?" };

  const debts = calcDebts(transactions, members);

  // 長按事件處理
  const handleLongPressTx = (tx: Transaction) => {
    setDeletingTransaction(tx);
    setIsDeleteModalVisible(true);
  };

  // 短點擊事件處理（編輯模式）
  const handlePressTx = (tx: Transaction) => {
    setEditingTransaction(tx);
    setShowFormModal(true);
  };

  // 確定從資料庫丟棄記帳
  const confirmDeleteTx = async () => {
    if (!deletingTransaction || !adventureId) return;
    try {
      await fsDeleteDoc(doc(db, "adventures", adventureId, "transactions", deletingTransaction.id));
    } catch (e) {
      console.error("刪除失敗：", e);
      Alert.alert("丟棄失敗", "請檢查網路連線後再試");
    } finally {
      setIsDeleteModalVisible(false);
      setDeletingTransaction(null);
    }
  };


  if (loading) return <View style={mainStyles.loading}><ActivityIndicator size="large" color="#5E433B" /></View>;

  return (
    <View style={mainStyles.container}>
      {/* ── Tab Bar ── */}
      <View style={mainStyles.tabRow}>
        {(["debt", "details"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[mainStyles.tab, activeTab === tab && mainStyles.tabActive]}
            onPress={() => handleTabPress(tab)}
          >
            <Text style={[mainStyles.tabText, activeTab === tab && mainStyles.tabTextActive]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Image
        source={require("../../img/ad_line.png")}
        style={mainStyles.separator}
      />
      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={{ flex: 1 }}
        contentContainerStyle={{ width: SCREEN_WIDTH * 2 }}
      >
        {/* ── DEBT Tab ── */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ScrollView contentContainerStyle={mainStyles.scrollContent}>
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
                        <View style={mainStyles.debtPerson}>
                          <Avatar member={from} size={54} />
                          <Text style={mainStyles.debtName} numberOfLines={1}>
                            {from.name}
                          </Text>
                        </View>

                        <View style={mainStyles.debtMiddle}>
                          <Text style={mainStyles.debtAmount}>
                            ${`NT${debt.amount}`}
                          </Text>
                          <ChevronRight color="#5E433B" size={20} />
                        </View>

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
          </ScrollView>
        </View>
        {/* ── DETAILS Tab ── */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ScrollView contentContainerStyle={mainStyles.scrollContent}>
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
                      /* 將原包覆外層改為具備手勢辨識的按鈕 */
                      <TouchableOpacity
                        key={tx.id}
                        style={mainStyles.txCard}
                        activeOpacity={0.85}
                        onPress={() => handlePressTx(tx)}
                        onLongPress={() => handleLongPressTx(tx)}
                        delayLongPress={600}
                      >
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
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            )}
          </ScrollView>
        </View>

      </ScrollView>
      {/* ── FAB 新增按鈕 ── */}
      <TouchableOpacity
        style={mainStyles.fab}
        onPress={() => {
          setEditingTransaction(null); // 明確清除編輯目標狀態，切換至純新增
          setShowFormModal(true);
        }}
      >
        <Plus color="#FFF" size={28} />
      </TouchableOpacity>

      {/* ── 表單新增 / 編輯彈出視窗 ── */}
      {showFormModal && (
        <TransactionFormModal
          visible={showFormModal}
          members={members}
          adventureId={adventureId}
          rates={liveRates}
          editTarget={editingTransaction}
          onClose={() => {
            setShowFormModal(false);
            setEditingTransaction(null);
          }}
        />
      )}

      {/* ── 🔴 客製化 Y2K 粗邊風格「記帳丟棄框」 ── */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <View style={mainStyles.alertOverlay}>
          <View style={mainStyles.alertCardContainer}>
            <View style={mainStyles.alertCardShadow} />
            <View style={mainStyles.alertCard}>
              <Text style={mainStyles.alertTitle}>刪除記帳紀錄</Text>

              <Image
                source={require("../../img/ad_line.png")}
                style={addStyles.modalSeparator}
              />

              <Text style={mainStyles.alertMessage}>
                確定要把「{deletingTransaction?.item || "未命名"}」的這筆開銷從帳本中撕掉丟棄嗎？
              </Text>

              <View style={addStyles.modalBtnRow}>
                <View style={addStyles.modalBtnContainer}>
                  <View style={[addStyles.modalBtnShadow, { backgroundColor: "#8A9A84" }]} />
                  <TouchableOpacity
                    style={[addStyles.modalBtn, { backgroundColor: "#C2D1BC" }]}
                    onPress={() => {
                      setIsDeleteModalVisible(false);
                      setDeletingTransaction(null);
                    }}
                  >
                    <Text style={addStyles.modalBtnText}>取消</Text>
                  </TouchableOpacity>
                </View>

                <View style={addStyles.modalBtnContainer}>
                  <View style={[addStyles.modalBtnShadow, { backgroundColor: "#9E4714" }]} />
                  <TouchableOpacity
                    style={[addStyles.modalBtn, { backgroundColor: "#EC7424" }]}
                    onPress={confirmDeleteTx}
                  >
                    <Text style={[addStyles.modalBtnText, { color: "#FFF" }]}>
                      丟棄
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Calendar Picker Modal ────────────────────────────────────────────────────

function CalendarPickerModal({
  visible,
  selectedDate,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  selectedDate: Date;
  onConfirm: (date: Date) => void;
  onClose: () => void;
}) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [picked, setPicked] = useState<Date | null>(selectedDate);

  useEffect(() => {
    if (visible) {
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
      setPicked(selectedDate);
    }
  }, [visible]);

  const today = new Date();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  const cells: { day: number; thisMonth: boolean; date: Date }[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    const day = daysInPrevMonth - firstDayOfMonth + 1 + i;
    const pm = viewMonth === 0 ? 11 : viewMonth - 1;
    const py = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day, thisMonth: false, date: new Date(py, pm, day) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d,
      thisMonth: true,
      date: new Date(viewYear, viewMonth, d),
    });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nm = viewMonth === 11 ? 0 : viewMonth + 1;
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ day: d, thisMonth: false, date: new Date(ny, nm, d) });
  }

  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const isSelected = (date: Date) =>
    picked !== null &&
    date.getFullYear() === picked.getFullYear() &&
    date.getMonth() === picked.getMonth() &&
    date.getDate() === picked.getDate();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={calStyles.overlay}>
        <View style={calStyles.sheet}>
          <Text style={calStyles.title}>選擇日期</Text>

          <View style={calStyles.monthRow}>
            <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn}>
              <Text style={calStyles.navText}>‹</Text>
            </TouchableOpacity>
            <Text style={calStyles.monthText}>
              {MONTHS_ZH[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn}>
              <Text style={calStyles.navText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={calStyles.weekRow}>
            {WEEKDAYS_ZH.map((d, i) => (
              <Text
                key={i}
                style={[calStyles.weekDay, i === 0 && calStyles.weekDaySun]}
              >
                {d}
              </Text>
            ))}
          </View>

          <View style={calStyles.grid}>
            {cells.map((cell, i) => {
              const sel = isSelected(cell.date);
              const tod = isToday(cell.date) && !sel;
              return (
                <TouchableOpacity
                  key={i}
                  style={[calStyles.cell, sel && calStyles.cellSelected]}
                  onPress={() => cell.thisMonth && setPicked(cell.date)}
                  activeOpacity={cell.thisMonth ? 0.7 : 1}
                >
                  <Text
                    style={[
                      calStyles.cellText,
                      !cell.thisMonth && calStyles.cellTextOther,
                      tod && calStyles.cellTextToday,
                      sel && calStyles.cellTextSelected,
                    ]}
                  >
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={calStyles.hint}>
            {picked ? fmtDate(picked) : "請點選日期"}
          </Text>

          <View style={calStyles.btnRow}>
            <TouchableOpacity style={calStyles.cancelBtn} onPress={onClose}>
              <Text style={calStyles.cancelText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[calStyles.confirmBtn, !picked && { opacity: 0.5 }]}
              onPress={() => picked && onConfirm(picked)}
            >
              <Text style={calStyles.confirmText}>確認</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Split Screen Modal ───────────────────────────────────────────────────────

type SplitType = "ratio" | "custom";

type SplitConfig = {
  mode: SplitType;
  ratios: Record<string, string>;
  customAmts: Record<string, string>;
};

function buildEqualCustomAmts(
  members: Member[],
  twdTotal: number,
): Record<string, string> {
  const result: Record<string, string> = {};
  const count = members.length;
  if (count === 0) return result;

  const safeTotal = Number.isFinite(twdTotal) ? Math.max(0, twdTotal) : 0;
  const base = Math.floor(safeTotal / count);
  const remainder = safeTotal - base * count;

  members.forEach((m, idx) => {
    const amt = idx === count - 1 ? base + remainder : base;
    result[m.id] = String(amt);
  });

  return result;
}

function computeSplits(
  config: SplitConfig,
  members: Member[],
  twdTotal: number,
): Split[] | null {
  if (config.mode === "ratio") {
    const pairs = members.map((m) => ({
      id: m.id,
      r: parseFloat(config.ratios[m.id] || "0") || 0,
    }));
    const total = pairs.reduce((s, p) => s + p.r, 0);
    if (total <= 0) return null;
    return pairs
      .filter((p) => p.r > 0)
      .map((p) => ({
        memberId: p.id,
        amount: Math.round((p.r / total) * twdTotal),
      }));
  }
  const splits = members
    .map((m) => ({
      memberId: m.id,
      amount: parseFloat(config.customAmts[m.id] || "0") || 0,
    }))
    .filter((s) => s.amount > 0);
  return splits.length > 0 ? splits : null;
}

function splitSummary(config: SplitConfig, _members: Member[]): string {
  if (config.mode === "ratio") return "比例分配";
  return "金額分配";
}

function SplitScreenView({
  members,
  twdTotal,
  initialConfig,
  onConfirm,
  onClose,
}: {
  members: Member[];
  twdTotal: number;
  initialConfig: SplitConfig;
  onConfirm: (config: SplitConfig) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<SplitType>(initialConfig.mode);
  const [ratios, setRatios] = useState<Record<string, string>>(initialConfig.ratios);
  const [customAmts, setCustomAmts] = useState<Record<string, string>>(initialConfig.customAmts);

  useEffect(() => {
    setMode(initialConfig.mode);
    setRatios({ ...initialConfig.ratios });
    const hasCustomInput = members.some((m) => {
      const amt = parseFloat(initialConfig.customAmts[m.id] || "0") || 0;
      return amt > 0;
    });
    setCustomAmts(
      hasCustomInput
        ? { ...initialConfig.customAmts }
        : buildEqualCustomAmts(members, twdTotal),
    );
  }, [initialConfig, members, twdTotal]);

  const applyTwoPersonAutoRemainder = (memberId: string, value: string) => {
    setCustomAmts((prev) => {
      const next = { ...prev, [memberId]: value };
      if (members.length !== 2) return next;

      const other = members.find((m) => m.id !== memberId);
      if (!other) return next;

      const inputAmt = parseFloat(value || "0") || 0;
      const remain = Math.max(0, twdTotal - inputAmt);
      next[other.id] = String(Math.round(remain));
      return next;
    });
  };

  const ratioTotal = members.reduce(
    (s, m) => s + (parseFloat(ratios[m.id] || "0") || 0),
    0,
  );
  const ratioAmtFor = (id: string) => {
    const r = parseFloat(ratios[id] || "0") || 0;
    return ratioTotal > 0 ? Math.round((r / ratioTotal) * twdTotal) : 0;
  };

  const customSum = members.reduce(
    (s, m) => s + (parseFloat(customAmts[m.id] || "0") || 0),
    0,
  );
  const customRemain = twdTotal - customSum;

  const handleConfirm = () => {
    const cfg: SplitConfig = { mode, ratios, customAmts };
    const result = computeSplits(cfg, members, twdTotal);
    if (!result) {
      if (mode === "ratio") Alert.alert("請至少輸入一位成員的比例");
      else Alert.alert("請至少輸入一位成員的金額");
      return;
    }
    onConfirm(cfg);
    onClose();
  };

  const TABS: { key: SplitType; label: string; emoji: string }[] = [
    { key: "ratio", label: "比例分", emoji: "📊" },
    { key: "custom", label: "金額分", emoji: "✏️" },
  ];

  return (
    <View style={splitStyles.container}>
      <View style={splitStyles.header}>
        <TouchableOpacity onPress={onClose} style={splitStyles.backBtn}>
          <Text style={splitStyles.backText}>{"<"}</Text>
        </TouchableOpacity>
        <Text style={splitStyles.title}>替誰付錢</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={splitStyles.totalBanner}>
        <Text style={splitStyles.totalLabel}>總金額</Text>
        <Text style={splitStyles.totalAmt}>NT$ {twdTotal}</Text>
      </View>

      <View style={splitStyles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[splitStyles.tab, mode === t.key && splitStyles.tabActive]}
            onPress={() => setMode(t.key)}
          >
            <Text style={splitStyles.tabEmoji}>{t.emoji}</Text>
            <Text
              style={[
                splitStyles.tabLabel,
                mode === t.key && splitStyles.tabLabelActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={splitStyles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {mode === "ratio" && (
          <>
            <Text style={splitStyles.hint}>
              輸入每人比例，系統自動換算（例如 2:1:1）
            </Text>
            {members.map((m) => {
              const amt = ratioAmtFor(m.id);
              const r = parseFloat(ratios[m.id] || "0") || 0;
              return (
                <View key={m.id} style={splitStyles.row}>
                  <View style={splitStyles.rowLeft}>
                    <Avatar member={m} size={40} />
                    <Text style={splitStyles.rowName}>{m.name}</Text>
                  </View>
                  <View style={splitStyles.rowRight}>
                    <Text style={splitStyles.ratioAmt}>
                      {r > 0 ? `NT$ ${amt}` : "—"}
                    </Text>
                    <View style={splitStyles.ratioInputWrap}>
                      <TextInput
                        style={splitStyles.ratioInput}
                        value={ratios[m.id] ?? ""}
                        onChangeText={(v) =>
                          setRatios((prev) => ({ ...prev, [m.id]: v }))
                        }
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="#C8B8A2"
                      />
                    </View>
                  </View>
                </View>
              );
            })}
            <View style={splitStyles.ratioLegend}>
              <Text style={splitStyles.footNote}>
                比例合計：
                {members
                  .map((m) => ratios[m.id] || "0")
                  .filter((r) => parseFloat(r) > 0)
                  .join(" : ")}
              </Text>
            </View>
          </>
        )}

        {mode === "custom" && (
          <>
            <Text style={splitStyles.hint}>
              手動輸入每人的實際金額（兩人時會自動補上剩餘金額）
            </Text>
            {members.map((m) => (
              <View key={m.id} style={splitStyles.row}>
                <View style={splitStyles.rowLeft}>
                  <Avatar member={m} size={40} />
                  <Text style={splitStyles.rowName}>{m.name}</Text>
                </View>
                <View style={splitStyles.customInputWrap}>
                  <Text style={splitStyles.inputPrefix}>NT$</Text>
                  <TextInput
                    style={splitStyles.customInput}
                    value={customAmts[m.id] ?? ""}
                    onChangeText={(v) => applyTwoPersonAutoRemainder(m.id, v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#C8B8A2"
                  />
                </View>
              </View>
            ))}
            <View
              style={[
                splitStyles.remainBar,
                Math.abs(customRemain) < 1
                  ? splitStyles.remainBarOk
                  : splitStyles.remainBarWarn,
              ]}
            >
              <Text style={splitStyles.remainText}>
                {Math.abs(customRemain) < 1
                  ? "✓ 金額已全數分配"
                  : customRemain > 0
                    ? `還差 NT$ ${Math.round(customRemain)} 未分配`
                    : `超出 NT$ ${Math.round(-customRemain)}`}
              </Text>
              <Text style={splitStyles.remainSub}>
                已分配 NT$ {Math.round(customSum)} / 總計 NT$ {twdTotal}
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <TouchableOpacity style={splitStyles.confirmBtn} onPress={handleConfirm}>
        <Text style={splitStyles.confirmText}>確認分帳</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Transaction Form Modal (升級融合新增與編輯功能) ──────────────────────────

function TransactionFormModal({
  visible,
  members,
  adventureId,
  rates,
  editTarget,
  onClose,
}: {
  visible: boolean;
  members: Member[];
  adventureId: string;
  rates: Record<string, number>;
  editTarget: Transaction | null; // 判斷是編輯還是新增
  onClose: () => void;
}) {
  const [currency, setCurrency] = useState("TWD");
  const [amountStr, setAmountStr] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [datetime, setDatetime] = useState(fmtDatetime(new Date()));
  const [item, setItem] = useState("");
  const [payerId, setPayerId] = useState(members[0]?.id ?? "");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showPayerPicker, setShowPayerPicker] = useState(false);
  const [showSplitScreen, setShowSplitScreen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [saving, setSaving] = useState(false);
  const twdTotal = toTWD(parseFloat(amountStr) || 0, currency, rates);

  const [splitConfig, setSplitConfig] = useState<SplitConfig>({
    mode: "ratio",
    ratios: Object.fromEntries(members.map((m) => [m.id, "1"])),
    customAmts: buildEqualCustomAmts(members, 0),
  });

  // 如果有傳入 editTarget 則進行表單初始化賦值
  useEffect(() => {
    if (editTarget) {
      setCurrency(editTarget.currency);
      setAmountStr(String(editTarget.amount));
      setItem(editTarget.item);
      setPayerId(editTarget.payerId);
      setImageUri(editTarget.imageUri ?? null);
      setNote(editTarget.note ?? "");
      setDatetime(editTarget.datetime);

      // 反推還原分帳資訊
      const targetAmts: Record<string, string> = {};
      editTarget.splits.forEach(s => {
        targetAmts[s.memberId] = String(s.amount);
      });
      setSplitConfig({
        mode: "custom", // 編輯舊帳一律先轉金額自訂方便對齊
        ratios: Object.fromEntries(members.map((m) => [m.id, "1"])),
        customAmts: { ...buildEqualCustomAmts(members, editTarget.twd), ...targetAmts }
      });
    } else {
      // 純新增模式
      setPayerId(members[0]?.id ?? "");
      setSplitConfig({
        mode: "ratio",
        ratios: Object.fromEntries(members.map((m) => [m.id, "1"])),
        customAmts: buildEqualCustomAmts(members, 0),
      });
    }
  }, [editTarget, members]);

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

    const splits = computeSplits(splitConfig, members, twdTotal);
    if (!splits) {
      Alert.alert("請完成分帳設定");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        currency,
        amount: rawAmt,
        twd: twdTotal,
        datetime,
        item: item.trim(),
        payerId,
        splits,
        imageUri: imageUri ?? null,
        note: note.trim(),
      };

      if (editTarget) {
        // 🚀 執行編輯更新更新
        await updateDoc(doc(db, "adventures", adventureId, "transactions", editTarget.id), payload);
      } else {
        // ➕ 新增新記帳
        await addDoc(collection(db, "adventures", adventureId, "transactions"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      onClose();
    } catch (e) {
      Alert.alert("儲存失敗", "請檢查網路連線試試");
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  };

  const payer = members.find((m) => m.id === payerId);

  return (
    <Modal visible={visible} animationType="slide">
      {showSplitScreen ? (
        <SplitScreenView
          members={members}
          twdTotal={twdTotal}
          initialConfig={splitConfig}
          onConfirm={(cfg) => {
            setSplitConfig(cfg);
            setShowSplitScreen(false);
          }}
          onClose={() => setShowSplitScreen(false)}
        />
      ) : (
        <View style={addStyles.container}>
          <View style={addStyles.header}>
            <TouchableOpacity onPress={onClose} style={addStyles.backBtn}>
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
              <Text style={addStyles.label}>日期</Text>
              <TouchableOpacity
                style={addStyles.dropdown}
                onPress={() => setShowCalendar(true)}
              >
                <Text style={addStyles.dropdownText}>{datetime}</Text>
                <ChevronDown color="#5E433B" size={16} />
              </TouchableOpacity>

              <Text style={addStyles.label}>品項</Text>
              <TextInput
                style={addStyles.field}
                value={item}
                onChangeText={setItem}
                placeholder="請輸入名稱"
                placeholderTextColor="#C8B8A2"
              />

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

              <Text style={addStyles.label}>替誰付錢</Text>
              <TouchableOpacity
                style={addStyles.splitEntryRow}
                onPress={() => setShowSplitScreen(true)}
              >
                <View style={addStyles.splitEntryLeft}>
                  <View style={addStyles.avatarStack}>
                    {members.slice(0, 4).map((m, i) => (
                      <View
                        key={m.id}
                        style={[addStyles.avatarStackItem, { left: i * 22 }]}
                      >
                        <Avatar member={m} size={28} />
                      </View>
                    ))}
                  </View>
                  <Text style={addStyles.splitEntrySummary}>
                    {splitSummary(splitConfig, members)}
                  </Text>
                </View>
                <ChevronRight color="#5E433B" size={18} />
              </TouchableOpacity>

              <Text style={addStyles.label}>圖片</Text>
              <TouchableOpacity
                style={addStyles.imagePicker}
                onPress={pickImage}
              >
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={addStyles.imagePreview}
                    resizeMode="cover"
                  />
                ) : null}
              </TouchableOpacity>

              <Text style={addStyles.label}>備註</Text>
              <TextInput
                style={[
                  addStyles.field,
                  { height: 50, textAlignVertical: "top" },
                ]}
                value={note}
                onChangeText={setNote}
                placeholder="補充備註..."
                placeholderTextColor="#C8B8A2"
                multiline
              />

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

          {/* 貨幣彈出 Sheet */}
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
                      {c === "TWD"
                        ? "基準貨幣"
                        : `1 ${c} ≈ NT$ ${rates[c] ?? FALLBACK_RATES[c]}`}
                    </Text>
                    {c === currency && <Text style={sheetStyles.optionCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* 付款人彈出 Sheet */}
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
                    <Text style={[sheetStyles.optionCurrency, m.id === payerId && sheetStyles.optionSelected]}>
                      {m.name}
                    </Text>
                    {m.id === payerId && <Text style={sheetStyles.optionCheck}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* 🌟 修正：將月曆選擇器移至主 Modal 內部，確保 iOS 正確渲染 */}
          <CalendarPickerModal
            visible={showCalendar}
            selectedDate={selectedDate}
            onConfirm={(date) => {
              setSelectedDate(date);
              setDatetime(fmtDatetime(date));
              setShowCalendar(false);
            }}
            onClose={() => setShowCalendar(false)}
          />
        </View>
      )}
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const mainStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 60, position: "relative" },
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FDFBF0" },
  tabRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 10 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderWidth: 2, borderColor: "#5E433B", backgroundColor: "#FDFBF0" },
  tabActive: { backgroundColor: "#5E433B" },
  tabText: { fontSize: 14, fontWeight: "bold", color: "#5E433B" },
  tabTextActive: { color: "#FDFBF0" },
  separator: { width: "100%", height: 10, resizeMode: "contain", marginBottom: 4 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

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
  txPayerName: { fontSize: 10, color: "#5E433B", fontWeight: "bold", marginTop: 4, textAlign: "center" },
  txMiddle: { flex: 1 },
  txItem: { fontSize: 14, fontWeight: "bold", color: "#5E433B" },
  txDate: { fontSize: 11, color: "#8D6E63", marginTop: 3 },
  txRight: { alignItems: "flex-end", gap: 4 },
  txAmount: { fontSize: 13, fontWeight: "bold", color: "#5E433B" },
  txCoin: { fontSize: 18 },

  debtCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", borderWidth: 2, borderColor: "#5E433B", padding: 16, marginBottom: 12 },
  debtPerson: { alignItems: "center", width: 80 },
  debtName: { fontSize: 11, fontWeight: "bold", color: "#5E433B", marginTop: 5, textAlign: "center" },
  debtMiddle: { flexDirection: "row", alignItems: "center", gap: 2 },
  debtAmount: { fontSize: 15, fontWeight: "bold", color: "#5E433B" },
  avatarFallback: { backgroundColor: "#E8DDD5", justifyContent: "center", alignItems: "center" },
  avatarInitial: { fontWeight: "bold", color: "#5E433B" },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { fontSize: 16, fontWeight: "bold", color: "#5E433B" },
  emptySub: { fontSize: 13, color: "#8D6E63", marginTop: 8 },
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

  // 🔴 追加：客製化設計款彈窗樣式
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertCardContainer: {
    width: "82%",
    position: "relative",
  },
  alertCardShadow: {
    position: "absolute",
    top: 6,
    left: 6,
    right: -6,
    bottom: -6,
    backgroundColor: "#5E433B",
  },
  alertCard: {
    width: "100%",
    backgroundColor: "#FDFBF0",
    borderWidth: 2,
    borderColor: "#5E433B",
    padding: 20,
    alignItems: "center",
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5E433B",
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: 14,
    color: "#4A342E",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 20,
  },
});

const addStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFBF0", paddingTop: 56 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#E8DDD5" },
  backBtn: { marginRight: 16, paddingRight: 8 },
  backText: { fontSize: 22, color: "#5E433B", fontWeight: "bold" },
  amountRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  currencyBox: { flexDirection: "row", alignItems: "center", borderWidth: 2, borderColor: "#5E433B", paddingHorizontal: 10, paddingVertical: 7, gap: 4 },
  currencyText: { fontSize: 13, fontWeight: "bold", color: "#5E433B" },
  dollarSign: { fontSize: 24, fontWeight: "bold", color: "#5E433B" },
  amountInput: { flex: 1, fontSize: 32, fontWeight: "bold", color: "#5E433B" },
  convertedHint: { fontSize: 12, color: "#8D6E63", alignSelf: "flex-end", marginBottom: 4 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  label: { fontSize: 13, fontWeight: "bold", color: "#5E433B", marginTop: 18, marginBottom: 7 },
  field: { backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#C8B8A2", padding: 12, fontSize: 14, color: "#5E433B" },
  placeholder: { color: "#C8B8A2" },
  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#C8B8A2", padding: 12 },
  dropdownText: { fontSize: 14, color: "#5E433B" },
  splitEntryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#C8B8A2", padding: 12, minHeight: 56 },
  splitEntryLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  avatarStack: { width: 22 * 3 + 28, height: 28, position: "relative" },
  avatarStackItem: { position: "absolute", top: 0 },
  splitEntrySummary: { fontSize: 14, fontWeight: "bold", color: "#5E433B", marginLeft: 8 },
  imagePicker: { width: "100%", height: 100, backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#C8B8A2", overflow: "hidden" },
  imagePreview: { width: "100%", height: "100%" },
  saveBtn: { backgroundColor: "#EC7424", borderWidth: 2, borderColor: "#5E433B", padding: 16, alignItems: "center", marginTop: 24 },
  saveBtnText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  modalSeparator: { width: "100%", height: 8, resizeMode: "contain", marginBottom: 12 },

  // 🔴 像素厚重雙層按鈕結構樣式
  modalBtnRow: { flexDirection: "row", gap: 14, marginTop: 4 },
  modalBtnContainer: { flex: 1, position: "relative", height: 45 },
  modalBtnShadow: { position: "absolute", top: 4, left: 4, right: -4, bottom: -4 },
  modalBtn: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderWidth: 2, borderColor: "#5E433B", alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontWeight: "bold", fontSize: 14 },
});

const splitStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FDFBF0", paddingTop: 56 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#E8DDD5" },
  backBtn: { paddingRight: 8 },
  backText: { fontSize: 22, color: "#5E433B", fontWeight: "bold" },
  title: { fontSize: 16, fontWeight: "bold", color: "#5E433B" },
  totalBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#5E433B", paddingHorizontal: 20, paddingVertical: 12 },
  totalLabel: { fontSize: 13, color: "#E8DDD5", fontWeight: "bold" },
  totalAmt: { fontSize: 22, fontWeight: "bold", color: "#FDFBF0" },
  tabRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderWidth: 2, borderColor: "#C8B8A2", backgroundColor: "#FFF", gap: 3 },
  tabActive: { borderColor: "#5E433B", backgroundColor: "#5E433B" },
  tabEmoji: { fontSize: 18 },
  tabLabel: { fontSize: 11, fontWeight: "bold", color: "#8D6E63" },
  tabLabelActive: { color: "#FDFBF0" },
  hint: { fontSize: 12, color: "#8D6E63", marginHorizontal: 16, marginBottom: 10, marginTop: 4 },
  scroll: { flex: 1, paddingHorizontal: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", borderWidth: 1.5, borderColor: "#E8DDD5", padding: 12, marginBottom: 8 },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  rowName: { fontSize: 14, fontWeight: "bold", color: "#5E433B", flex: 1 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  footNote: { fontSize: 12, color: "#8D6E63", textAlign: "center", marginVertical: 12, fontWeight: "bold" },
  ratioAmt: { fontSize: 12, color: "#8D6E63", minWidth: 70, textAlign: "right" },
  ratioInputWrap: { borderWidth: 1.5, borderColor: "#C8B8A2", backgroundColor: "#FFF", paddingHorizontal: 8, paddingVertical: 4, minWidth: 56, alignItems: "center" },
  ratioInput: { fontSize: 16, fontWeight: "bold", color: "#5E433B", textAlign: "center", minWidth: 40 },
  ratioLegend: { alignItems: "center", marginVertical: 8 },
  customInputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: "#C8B8A2", backgroundColor: "#FFF", paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  inputPrefix: { fontSize: 12, color: "#8D6E63", fontWeight: "bold" },
  customInput: { fontSize: 16, fontWeight: "bold", color: "#5E433B", minWidth: 70, textAlign: "right" },
  remainBar: { marginTop: 8, padding: 14, alignItems: "center", gap: 4, borderWidth: 2 },
  remainBarOk: { borderColor: "#38B000", backgroundColor: "#F0FFF0" },
  remainBarWarn: { borderColor: "#E84A41", backgroundColor: "#FFF5F5" },
  remainText: { fontSize: 13, fontWeight: "bold", color: "#5E433B" },
  remainSub: { fontSize: 11, color: "#8D6E63" },
  confirmBtn: { position: "absolute", bottom: 34, left: 20, right: 20, backgroundColor: "#EC7424", borderWidth: 2, borderColor: "#5E433B", padding: 16, alignItems: "center", shadowColor: "#5E433B", shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  confirmText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
});

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#FDFBF0", borderTopWidth: 3, borderTopColor: "#5E433B", padding: 24, paddingBottom: 44 },
  sheetTitle: { fontSize: 16, fontWeight: "bold", color: "#5E433B", textAlign: "center", marginBottom: 18 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#E8DDD5" },
  optionCurrency: { fontSize: 16, fontWeight: "bold", color: "#5E433B", flex: 1 },
  optionRate: { fontSize: 12, color: "#8D6E63" },
  optionSelected: { color: "#EC7424" },
  optionCheck: { fontSize: 16, color: "#EC7424", fontWeight: "bold" },
});

const calStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", paddingHorizontal: 16 },
  sheet: { backgroundColor: "#FFF", width: "100%", borderRadius: 16, padding: 20, paddingBottom: 24, borderWidth: 2, borderColor: "#5E433B" },
  title: { fontSize: 16, fontWeight: "bold", color: "#5E433B", textAlign: "center", marginBottom: 16 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  navBtn: { padding: 8 },
  navText: { fontSize: 26, color: "#E84A41", fontWeight: "bold", lineHeight: 30 },
  monthText: { fontSize: 16, color: "#5E433B", fontWeight: "600" },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekDay: { flex: 1, textAlign: "center", fontSize: 13, color: "#5E433B", fontWeight: "600", paddingVertical: 4 },
  weekDaySun: { color: "#8D6E63" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.28%", aspectRatio: 1, justifyContent: "center", alignItems: "center" },
  cellSelected: { backgroundColor: "#E84A41", borderRadius: 100 },
  cellText: { fontSize: 16, color: "#333333", fontWeight: "500" },
  cellTextOther: { color: "#CCCCCC" },
  cellTextToday: { color: "#EC7424", fontWeight: "bold" },
  cellTextSelected: { color: "#FFF", fontWeight: "bold" },
  hint: { textAlign: "center", color: "#8D6E63", fontSize: 13, marginTop: 12, marginBottom: 16 },
  btnRow: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: "#FDFBF0", borderWidth: 2, borderColor: "#5E433B", padding: 14, alignItems: "center" },
  cancelText: { color: "#5E433B", fontWeight: "bold", fontSize: 15 },
  confirmBtn: { flex: 1, backgroundColor: "#E84A41", borderWidth: 2, borderColor: "#5E433B", padding: 14, alignItems: "center" },
  confirmText: { color: "#FFF", fontWeight: "bold", fontSize: 15 },
});