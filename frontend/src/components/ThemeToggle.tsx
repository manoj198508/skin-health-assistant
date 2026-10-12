import { useTheme, type Theme } from "../context/ThemeContext";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

const OPTIONS: { value: Theme; icon: typeof SunIcon; label: string }[] = [
  { value: "light", icon: SunIcon, label: "Light" },
  { value: "dark", icon: MoonIcon, label: "Dark" },
  { value: "system", icon: MonitorIcon, label: "System" },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setTheme(opt.value)}
          aria-label={opt.label}
          title={opt.label}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
            theme === opt.value
              ? "bg-white text-teal-700 shadow-sm dark:bg-slate-600 dark:text-teal-300"
              : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          }`}
        >
          <opt.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
