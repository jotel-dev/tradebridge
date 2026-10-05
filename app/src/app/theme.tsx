"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
type Theme = "dark" | "light";
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({ theme: "dark", toggleTheme: () => {} });
export function ThemeProvider({ children }: { children: ReactNode }) { const [theme, setTheme] = useState<Theme>("dark"); useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]); return <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme((value) => value === "dark" ? "light" : "dark") }}>{children}</ThemeContext.Provider>; }
export const useTheme = () => useContext(ThemeContext);
