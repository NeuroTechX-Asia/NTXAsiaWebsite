"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ntx-theme";

function apply(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "light" ? "#f7f6fb" : "#08090d");
}

export default function ThemeToggle({ t }) {
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = document.documentElement.dataset.theme;
    setTheme(stored === "light" ? "light" : "dark");
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode: the choice just does not persist */
    }
  }

  const label = theme === "light" ? t.theme.toDark : t.theme.toLight;

  return (
    <button
      type="button"
      onClick={toggle}
      className="theme-toggle"
      aria-label={label}
      title={label}
      aria-pressed={theme === "light"}
      data-ready={mounted ? "true" : "false"}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {theme === "light" ? (
          <>
            <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.6v2.1M12 19.3v2.1M4.2 12H2.1M21.9 12h-2.1M5.8 5.8 4.3 4.3M19.7 19.7l-1.5-1.5M18.2 5.8l1.5-1.5M4.3 19.7l1.5-1.5" />
          </>
        )}
      </svg>
    </button>
  );
}
