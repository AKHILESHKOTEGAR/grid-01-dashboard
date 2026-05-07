"use client";
import { createContext, useContext, useEffect, ReactNode } from "react";

interface ThemeCtx {
  theme: "dark";
  isDark: boolean;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx>({ theme: "dark", isDark: true, toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("light");
    localStorage.setItem("grid01-theme", "dark");
  }, []);

  return (
    <Ctx.Provider value={{ theme: "dark", isDark: true, toggle: () => {} }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx);
