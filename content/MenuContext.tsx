// context/MenuContext.tsx
import React, { createContext, useState } from "react";

export const MenuContext = createContext({
  openMenu: () => {},
});

export const MenuProvider = ({
  children,
  onOpen,
}: {
  children: React.ReactNode;
  onOpen: () => void;
}) => {
  return (
    <MenuContext.Provider value={{ openMenu: onOpen }}>
      {children}
    </MenuContext.Provider>
  );
};
