import { useState, useCallback, useMemo } from "react";
import { useScreener } from "@/api/hooks/useScreener";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  type Strategy,
  type Condition,
  runStrategy,
  loadStrategies,
  saveStrategies,
  makeId,
  STRATEGY_COLORS,
  describeCondition,
} from "./lib/engine";
import { ConditionBuilder } from "./components/ConditionBuilder";
import { MatchResults } from "./components/MatchResults";
import { PresetPicker } from "./components/PresetPicker";
import {
  FlaskConical,
  Save,
  Trash2,
  FolderOpen,
  X,
} from "lucide-react";

export function StrategyLabPage() {
  usePageTitle("Strategy Lab");

  // Fetch screener data (max 200, sorted by ticker for even distribution)
  const { data: allStocks, isLoading: stocksLoading } = useScreener({
    limit: 200,
    sort_by: "ticker",
    sort_dir: "asc",
  });

  // Active strategy state
  const [name, setName] = useState("Untitled Strategy");
  const [description, setDescription] = useState("");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [color, setColor] = useState(STRATEGY_COLORS[0]);

  // Saved strategies
  const [savedStrategies, setSavedStrategies] = useState<Strategy[]>(() => loadStrategies());
  const [showSaved, setShowSaved] = useState(false);
  const [showPresets, setShowPresets] = useState(true);

  // Run the strategy
  const matches = useMemo(() => {
    if (!allStocks || conditions.length === 0) return [];
    return runStrategy(allStocks, conditions);
  }, [allStocks, conditions]);

  // Save strategy
  const handleSave = useCallback(() => {
    if (conditions.length === 0) return;
    const strategy: Strategy = {
      id: makeId(),
      name: name || "Untitled Strategy",
      description,
      conditions,
      createdAt: new Date().toISOString(),
      color,
    };
    const updated = [...savedStrategies, strategy];
    setSavedStrategies(updated);
    saveStrategies(updated);
  }, [name, description, conditions, color, savedStrategies]);

  // Load a saved strategy
  const handleLoad = useCallback((strategy: Strategy) => {
    setName(strategy.name);
    setDescription(strategy.description);
    setConditions(strategy.conditions);
    setColor(strategy.color);
    setShowSaved(false);
    setShowPresets(false);
  }, []);

  // Delete saved strategy
  const handleDelete = useCallback(
    (id: string) => {
      const updated = savedStrategies.filter((s) => s.id !== id);
      setSavedStrategies(updated);
      saveStrategies(updated);
    },
    [savedStrategies],
  );

  // Load preset
  const handlePreset = useCallback(
    (presetName: string, presetDesc: string, presetConditions: Condition[], presetColor: string) => {
      setName(presetName);
      setDescription(presetDesc);
      setConditions(presetConditions);
      setColor(presetColor);
      setShowPresets(false);
    },
    [],
  );

  // Reset
  const handleReset = useCallback(() => {
    setName("Untitled Strategy");
    setDescription("");
    setConditions([]);
    setColor(STRATEGY_COLORS[Math.floor(Math.random() * STRATEGY_COLORS.length)]);
    setShowPresets(true);
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <FlaskConical className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Strategy Lab</h1>
            <p className="text-sm text-text-muted">
              Build custom scanners &mdash; combine conditions to find matching stocks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSaved((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-accent/30 hover:text-text-primary"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Saved
            {savedStrategies.length > 0 && (
              <span className="rounded-full bg-accent/10 px-1.5 text-[10px] font-semibold text-accent">
                {savedStrategies.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Saved strategies drawer */}
      {showSaved && (
        <div className="rounded-xl border border-border bg-bg-card p-4 space-y-3 animate-slideDown">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-text-primary">Saved Strategies</h3>
            <button
              type="button"
              onClick={() => setShowSaved(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {savedStrategies.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-muted">
              No saved strategies yet. Build one below and save it.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {savedStrategies.map((s) => (
                <div
                  key={s.id}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-bg-secondary p-3 transition-colors hover:border-accent/30"
                >
                  <div
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{s.name}</p>
                    <p className="text-xs text-text-muted truncate">{s.description}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {s.conditions.map((c, i) => (
                        <span
                          key={i}
                          className="rounded bg-bg-primary px-1.5 py-0.5 text-[10px] text-text-muted"
                        >
                          {describeCondition(c)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleLoad(s)}
                      className="rounded p-1.5 text-accent hover:bg-accent/10"
                      title="Load strategy"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      className="rounded p-1.5 text-red hover:bg-red/10"
                      title="Delete strategy"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Presets */}
      {showPresets && conditions.length === 0 && (
        <PresetPicker onSelect={handlePreset} />
      )}

      {/* Strategy Builder */}
      <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Color picker */}
          <div className="relative">
            <button
              type="button"
              className="peer h-8 w-8 rounded-lg border border-border transition-colors hover:border-accent/30"
              style={{ backgroundColor: color }}
              title="Strategy color"
            />
            <div className="invisible absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-lg border border-border bg-bg-secondary p-2 shadow-lg peer-focus:visible hover:visible peer-hover:visible">
              {STRATEGY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-5 w-5 rounded-full transition-transform hover:scale-125 ${
                    c === color ? "ring-2 ring-accent ring-offset-1 ring-offset-bg-secondary" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Name input */}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Strategy name..."
            className="flex-1 rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-sm font-medium text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
          />

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={conditions.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-red/30 hover:text-red"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Description */}
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description (optional)..."
          className="w-full rounded-lg border border-border bg-bg-secondary px-3 py-1.5 text-xs text-text-secondary placeholder:text-text-muted focus:border-accent focus:outline-none"
        />

        {/* Conditions */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Conditions
            </span>
            {conditions.length > 0 && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                {conditions.length}
              </span>
            )}
          </div>
          <ConditionBuilder conditions={conditions} onChange={setConditions} />
        </div>
      </div>

      {/* Results */}
      {conditions.length > 0 && (
        <MatchResults
          results={matches}
          loading={stocksLoading}
          strategyColor={color}
        />
      )}
    </div>
  );
}
