import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 定義結構，讓 TS 認識你的冒險資料
interface Adventure {
  id: string;
  name: string;
  date: string;
  plans: any[];
}

const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // 關鍵點：加上 <Adventure[]>
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [currentAdvId, setCurrentAdvId] = useState<string | null>(null);

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

  return (
    <AppContext.Provider value={{ adventures, addAdventure, currentAdvId, setCurrentAdvId, getCurrentAdventure }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);