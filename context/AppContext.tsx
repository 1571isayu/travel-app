import { COLORS, COLORS_dark } from "@/constants/theme";
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

// --- 類型定義 ---
interface Adventure {
  id: string;
  name: string;
  date: string;
  plans: any[];
}

interface AppContextType {
  // 資料相關
  adventures: Adventure[];
  addAdventure: (name: string, date: string) => void;
  currentAdvId: string | null;
  setCurrentAdvId: (id: string | null) => void;
  getCurrentAdventure: () => Adventure | undefined;
  // 深色模式相關
  isDark: boolean;
  theme: typeof COLORS;
  toggleTheme: () => void;
}

// --- 建立 Context ---
const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // 1. 冒險資料狀態
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [currentAdvId, setCurrentAdvId] = useState<string | null>(null);

  // 2. 深色模式狀態
  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? COLORS_dark : COLORS;

  // --- 初始化：從本機讀取資料與主題 ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const [storedData, storedTheme] = await Promise.all([
          AsyncStorage.getItem('@pikmin_data'),
          AsyncStorage.getItem('@is_dark')
        ]);
        
        if (storedData) setAdventures(JSON.parse(storedData));
        if (storedTheme) setIsDark(JSON.parse(storedTheme));
      } catch (e) {
        console.error("載入資料失敗", e);
      }
    };
    loadData();
  }, []);

  // --- 資料操作邏輯 ---
  const saveData = async (newData: Adventure[]) => {
    setAdventures(newData);
    await AsyncStorage.setItem('@pikmin_data', JSON.stringify(newData));
  };

  const addAdventure = (name: string, date: string) => {
    const newAdv: Adventure = {
      id: Date.now().toString(),
      name,
      date,
      plans: [],
    };
    saveData([...adventures, newAdv]);
  };

  const getCurrentAdventure = () => adventures.find(a => a.id === currentAdvId);

  // --- 主題切換邏輯 ---
  const toggleTheme = async () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    await AsyncStorage.setItem('@is_dark', JSON.stringify(nextDark));
  };

  // --- 暴露給全 App 的內容 ---
  const value: AppContextType = {
    adventures,
    addAdventure,
    currentAdvId,
    setCurrentAdvId,
    getCurrentAdventure,
    isDark,
    theme,
    toggleTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// --- Hook ---
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};