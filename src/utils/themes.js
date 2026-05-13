export const THEME_PRESETS = [
  {
    id: "default",
    name: "Default",
    colors: {
      bg: "#070a12",
      surface: "#0b0f18",
      panel: "#111522",
      panel2: "#151329",
      field: "#101722",
      text: "#eef2ff",
      muted: "#8b94ad",
      faint: "#596174",
      accent: "#8b5cff",
      accent2: "#2f7dff",
      accent3: "#21a6ff",
      success: "#20a552",
      danger: "#ef4b4b",
    },
  },
  {
    id: "focus-blue",
    name: "Focus Blue",
    colors: {
      bg: "#06111f",
      surface: "#091827",
      panel: "#102237",
      panel2: "#132b46",
      field: "#0c1d30",
      text: "#edf7ff",
      muted: "#8ca8bf",
      faint: "#5f7185",
      accent: "#2f7dff",
      accent2: "#21a6ff",
      accent3: "#6fd4ff",
      success: "#2fc477",
      danger: "#ff5d6c",
    },
  },
  {
    id: "forest",
    name: "Forest",
    colors: {
      bg: "#07130d",
      surface: "#0d1c14",
      panel: "#13251a",
      panel2: "#1a3022",
      field: "#102017",
      text: "#eef8f1",
      muted: "#91a99a",
      faint: "#607267",
      accent: "#2fb36d",
      accent2: "#38d08a",
      accent3: "#7ee28f",
      success: "#38d08a",
      danger: "#ff6b5f",
    },
  },
  {
    id: "amber",
    name: "Amber",
    colors: {
      bg: "#160f07",
      surface: "#21170b",
      panel: "#2c1f10",
      panel2: "#342716",
      field: "#24190d",
      text: "#fff6e8",
      muted: "#b49b78",
      faint: "#7c6b55",
      accent: "#f0a22a",
      accent2: "#ffbf47",
      accent3: "#ffd166",
      success: "#41b86a",
      danger: "#ff655b",
    },
  },
  {
    id: "contrast",
    name: "High Contrast",
    colors: {
      bg: "#020409",
      surface: "#070b12",
      panel: "#0d1320",
      panel2: "#111827",
      field: "#080d16",
      text: "#ffffff",
      muted: "#b8c2d6",
      faint: "#8390a8",
      accent: "#00d4ff",
      accent2: "#4dff88",
      accent3: "#ffe45c",
      success: "#4dff88",
      danger: "#ff4d6d",
    },
  },
];

export const ACCENT_COLORS = [
  "#8b5cff",
  "#2f7dff",
  "#21a6ff",
  "#20a552",
  "#f0a22a",
  "#ef4b4b",
  "#00d4ff",
  "#ff5fb7",
];

export function getThemePreset(themePresetId) {
  return THEME_PRESETS.find((preset) => preset.id === themePresetId) || THEME_PRESETS[0];
}

export function getThemeColors(themePresetId, accentColor) {
  const preset = getThemePreset(themePresetId);
  return {
    ...preset.colors,
    accent: accentColor || preset.colors.accent,
  };
}

export function applyTheme(themePresetId, accentColor) {
  if (typeof document === "undefined") return;

  const colors = getThemeColors(themePresetId, accentColor);
  const root = document.documentElement;
  const transparentAccent = hexToRgb(colors.accent);
  const transparentAccent2 = hexToRgb(colors.accent2);
  const transparentSuccess = hexToRgb(colors.success);

  root.dataset.theme = themePresetId;
  root.style.setProperty("--theme-bg", colors.bg);
  root.style.setProperty("--theme-surface", colors.surface);
  root.style.setProperty("--theme-panel", colors.panel);
  root.style.setProperty("--theme-panel-2", colors.panel2);
  root.style.setProperty("--theme-field", colors.field);
  root.style.setProperty("--theme-field-border", rgba(transparentAccent2, 0.18));
  root.style.setProperty("--theme-border", rgba(transparentAccent, 0.18));
  root.style.setProperty("--theme-border-strong", rgba(transparentAccent, 0.56));
  root.style.setProperty("--theme-text", colors.text);
  root.style.setProperty("--theme-muted", colors.muted);
  root.style.setProperty("--theme-faint", colors.faint);
  root.style.setProperty("--theme-purple", colors.accent);
  root.style.setProperty("--theme-purple-soft", rgba(transparentAccent, 0.16));
  root.style.setProperty("--theme-blue", colors.accent2);
  root.style.setProperty("--theme-blue-2", colors.accent3);
  root.style.setProperty("--theme-green", colors.success);
  root.style.setProperty("--theme-green-soft", rgba(transparentSuccess, 0.18));
  root.style.setProperty("--theme-red", colors.danger);
  root.style.setProperty("--theme-scrollbar-track", rgba(hexToRgb(colors.bg), 0.74));
  root.style.setProperty("--theme-scrollbar-thumb", rgba(transparentAccent, 0.75));
  root.style.setProperty("--theme-scrollbar-thumb-2", rgba(transparentAccent2, 0.7));
}

function hexToRgb(hex) {
  const normalized = String(hex || "#000000").replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;

  const parsed = Number.parseInt(value, 16);
  if (Number.isNaN(parsed)) return { r: 0, g: 0, b: 0 };

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function rgba(rgb, alpha) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}
