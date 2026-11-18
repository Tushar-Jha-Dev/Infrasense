/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "infrasense_theme";

function getSystemTheme() {
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return { theme: stored, explicit: true };
    }
  } catch {
    // ignore storage errors
  }
  return { theme: getSystemTheme(), explicit: false };
}

export function ThemeProvider({ children }) {
  const [themeState, setThemeState] = useState(getInitialTheme);
  const { theme, explicit } = themeState;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        "content",
        theme === "dark" ? "#101617" : "#123A7C"
      );
    }

    if (explicit) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        // ignore storage errors
      }
    }
  }, [theme, explicit]);

  // Follow operating system changes only while the user has made no explicit choice
  useEffect(() => {
    if (explicit || typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setThemeState((prev) => {
        if (prev.explicit) return prev;
        return { theme: e.matches ? "dark" : "light", explicit: false };
      });
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [explicit]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const nextTheme = prev.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch {
        // ignore storage errors
      }
      return { theme: nextTheme, explicit: true };
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
