import { useSettingsStore } from '../stores/settings';

export function Settings() {
  const { theme, setTheme, fontSizeScale, setFontSizeScale } = useSettingsStore();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Settings</h2>
      
      <div className="p-4 border rounded-lg bg-secondary">
        <h3 className="font-semibold mb-2">Theme</h3>
        <div className="flex gap-4">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-4 py-2 rounded border ${
                theme === t ? 'bg-primary text-primary-foreground' : 'bg-background'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border rounded-lg bg-secondary">
        <h3 className="font-semibold mb-2">Font Size Scale: {fontSizeScale}x</h3>
        <div className="flex gap-4">
          {[0.75, 1, 1.25, 1.5, 2].map((s) => (
            <button
              key={s}
              onClick={() => setFontSizeScale(s)}
              className={`px-4 py-2 rounded border ${
                fontSizeScale === s ? 'bg-primary text-primary-foreground' : 'bg-background'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
