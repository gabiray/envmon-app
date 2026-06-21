import React, { useEffect, useMemo, useState } from "react";
import {
  FiCheck,
  FiChevronDown,
  FiMonitor,
  FiRefreshCw,
} from "react-icons/fi";

const STORAGE_KEY = "envmon-theme";

const THEME_GROUPS = [
  {
    title: "Recommended",
    items: [
      {
        value: "envmon",
        label: "EnvMon",
        hint: "Default EnvMon interface theme",
      },
      {
        value: "light",
        label: "Light",
        hint: "Clean bright DaisyUI theme",
      },
      {
        value: "dark",
        label: "Dark",
        hint: "Dark interface for low-light use",
      },
      {
        value: "corporate",
        label: "Corporate",
        hint: "Clean professional interface style",
      },
      {
        value: "business",
        label: "Business",
        hint: "High-contrast professional dark theme",
      },
      {
        value: "night",
        label: "Night",
        hint: "Modern dark theme with soft contrast",
      },
    ],
  },
  {
    title: "Nature & environment",
    items: [
      {
        value: "emerald",
        label: "Emerald",
        hint: "Green-accent theme suitable for environmental data",
      },
      {
        value: "forest",
        label: "Forest",
        hint: "Dark natural theme with green accents",
      },
      {
        value: "garden",
        label: "Garden",
        hint: "Soft natural theme with warm green tones",
      },
      {
        value: "autumn",
        label: "Autumn",
        hint: "Warm seasonal theme with earthy accents",
      },
      {
        value: "winter",
        label: "Winter",
        hint: "Bright theme with cool blue accents",
      },
      {
        value: "aqua",
        label: "Aqua",
        hint: "Fresh blue theme with strong visual contrast",
      },
    ],
  },
  {
    title: "Creative",
    items: [
      {
        value: "cyberpunk",
        label: "Cyberpunk",
        hint: "Bright futuristic theme with strong accent colors",
      },
      {
        value: "synthwave",
        label: "Synthwave",
        hint: "Colorful retro-futuristic interface theme",
      },
      {
        value: "retro",
        label: "Retro",
        hint: "Warm old-school theme with soft colors",
      },
      {
        value: "dracula",
        label: "Dracula",
        hint: "Popular dark theme with vivid accents",
      },
      {
        value: "luxury",
        label: "Luxury",
        hint: "Elegant dark theme with premium contrast",
      },
      {
        value: "sunset",
        label: "Sunset",
        hint: "Warm dark theme with orange-pink accents",
      },
    ],
  },
  {
    title: "Extra styles",
    items: [
      {
        value: "cupcake",
        label: "Cupcake",
        hint: "Soft playful light theme",
      },
      {
        value: "bumblebee",
        label: "Bumblebee",
        hint: "Bright theme with yellow accents",
      },
      {
        value: "valentine",
        label: "Valentine",
        hint: "Pink and warm themed interface",
      },
      {
        value: "halloween",
        label: "Halloween",
        hint: "Dark orange theme with strong contrast",
      },
      {
        value: "coffee",
        label: "Coffee",
        hint: "Dark brown theme with warm tones",
      },
      {
        value: "nord",
        label: "Nord",
        hint: "Calm cool theme inspired by Nordic palettes",
      },
    ],
  },
];

const THEMES = THEME_GROUPS.flatMap((group) => group.items);

function getInitialTheme() {
  try {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    if (savedTheme) return savedTheme;

    const currentTheme = document.documentElement.getAttribute("data-theme");
    return currentTheme || "envmon";
  } catch {
    return "envmon";
  }
}

function ThemeOption({ item, active, onSelect }) {
  return (
    <button
      type="button"
      data-theme={item.value}
      onClick={() => onSelect(item.value)}
      className={[
        "group rounded-2xl border p-3 text-left transition",
        active
          ? "border-primary/40 bg-primary/10 shadow-sm"
          : "border-base-300 bg-base-100 hover:bg-base-200/70",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-base-content">
            {item.label}
          </div>

          <div className="mt-0.5 line-clamp-2 text-xs leading-5 text-base-content/55">
            {item.hint}
          </div>
        </div>

        {active ? (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content">
            <FiCheck className="text-sm" />
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex gap-1.5">
        <span className="h-4 flex-1 rounded-full bg-primary" />
        <span className="h-4 flex-1 rounded-full bg-secondary" />
        <span className="h-4 flex-1 rounded-full bg-accent" />
        <span className="h-4 flex-1 rounded-full bg-neutral" />
      </div>
    </button>
  );
}

export default function ThemeSettingsPanel() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [expanded, setExpanded] = useState(false);

  const activeTheme = useMemo(() => {
    return THEMES.find((item) => item.value === theme) || THEMES[0];
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function handleResetTheme(event) {
    event.stopPropagation();
    setTheme("envmon");
  }

  return (
    <section className="overflow-hidden rounded-[28px] border border-base-300 bg-base-100 shadow-sm">
      <div
        role="button"
        tabIndex={0}
        className="px-5 py-4 sm:px-6"
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <FiMonitor className="shrink-0 text-[20px] text-primary" />

              <div className="min-w-0">
                <h2 className="text-base font-semibold text-base-content">
                  Appearance
                </h2>

                <p className="mt-0.5 text-sm text-base-content/60">
                  Current theme:{" "}
                  <span className="font-semibold text-base-content">
                    {activeTheme.label}
                  </span>
                </p>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-base-content/55">
              {activeTheme.hint}. The selected theme is saved locally in the
              browser.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="btn btn-sm rounded-xl border-base-300 bg-base-100"
              onClick={handleResetTheme}
              disabled={theme === "envmon"}
            >
              <FiRefreshCw />
              Reset
            </button>

            <button
              type="button"
              className="btn btn-sm btn-primary rounded-xl"
              onClick={(event) => {
                event.stopPropagation();
                setExpanded((prev) => !prev);
              }}
            >
              {expanded ? "Hide themes" : "Choose theme"}
              <FiChevronDown
                className={`transition-transform duration-200 ${
                  expanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-base-300 bg-base-200/30 px-5 py-5 sm:px-6">
          <div className="space-y-5">
            {THEME_GROUPS.map((group) => (
              <div key={group.title}>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-base-content/45">
                  {group.title}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => (
                    <ThemeOption
                      key={item.value}
                      item={item}
                      active={item.value === theme}
                      onSelect={setTheme}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
