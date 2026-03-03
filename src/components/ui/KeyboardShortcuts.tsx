import { useEffect, useState, useCallback } from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Global",
    shortcuts: [
      { keys: ["/"], description: "Focus search bar" },
      { keys: ["?"], description: "Show this help" },
      { keys: ["Esc"], description: "Close dialogs / menus" },
    ],
  },
  {
    title: "Simulator (Replay Mode)",
    shortcuts: [
      { keys: ["Space"], description: "Play / pause auto-advance" },
      { keys: ["→"], description: "Step forward one bar" },
      { keys: ["←"], description: "Step backward one bar" },
      { keys: ["B"], description: "Buy at current price" },
      { keys: ["S"], description: "Sell all shares" },
      { keys: ["R"], description: "Reset simulation" },
    ],
  },
  {
    title: "Onboarding Tour",
    shortcuts: [
      { keys: ["→", "Enter"], description: "Next step" },
      { keys: ["←"], description: "Previous step" },
      { keys: ["Esc"], description: "Dismiss tour" },
    ],
  },
];

export function KeyboardShortcuts() {
  const [visible, setVisible] = useState(false);

  const toggle = useCallback(() => setVisible((v) => !v), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "?" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && visible) {
        setVisible(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, toggle]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[98] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) setVisible(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-bg-secondary shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
            aria-label="Close shortcuts"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="mb-5 last:mb-0">
              <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5"
                  >
                    <span className="text-sm text-text-secondary">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={key}>
                          {i > 0 && (
                            <span className="mx-0.5 text-xs text-text-muted">
                              /
                            </span>
                          )}
                          <kbd className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-border bg-bg-primary px-1.5 py-0.5 text-xs font-mono font-medium text-text-primary shadow-sm">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3">
          <p className="text-center text-[11px] text-text-muted">
            Press <kbd className="rounded border border-border bg-bg-primary px-1 py-0.5 text-[10px] font-mono">?</kbd> to toggle this overlay
          </p>
        </div>
      </div>
    </div>
  );
}
