import { useState } from "react";
import { Plus, X, ChevronDown } from "lucide-react";
import {
  type Condition,
  type ConditionField,
  type NumericOp,
  FIELD_META,
  SECTORS,
  describeCondition,
} from "../lib/engine";

interface Props {
  conditions: Condition[];
  onChange: (conditions: Condition[]) => void;
}

export function ConditionBuilder({ conditions, onChange }: Props) {
  const [adding, setAdding] = useState(false);

  function addCondition(c: Condition) {
    onChange([...conditions, c]);
    setAdding(false);
  }

  function removeCondition(idx: number) {
    onChange(conditions.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      {/* Existing conditions */}
      {conditions.map((c, i) => (
        <div
          key={i}
          className="group flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-3 py-2 transition-colors hover:border-accent/30"
        >
          {i > 0 && (
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wider text-accent">
              AND
            </span>
          )}
          <span className="flex-1 text-sm text-text-primary">
            {describeCondition(c)}
          </span>
          <button
            type="button"
            onClick={() => removeCondition(i)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted md:opacity-0 transition-all hover:bg-red/10 hover:text-red group-hover:opacity-100"
            aria-label="Remove condition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {/* Add condition */}
      {adding ? (
        <AddConditionForm onAdd={addCondition} onCancel={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-bg-secondary/50 px-3 py-2.5 text-sm text-text-muted transition-colors hover:border-accent hover:bg-accent/5 hover:text-accent"
        >
          <Plus className="h-4 w-4" />
          Add condition
        </button>
      )}
    </div>
  );
}

// ── Inline add form ────────────────────────────────────────

function AddConditionForm({
  onAdd,
  onCancel,
}: {
  onAdd: (c: Condition) => void;
  onCancel: () => void;
}) {
  const [field, setField] = useState<ConditionField>("rsi_14");
  const meta = FIELD_META[field];

  // Numeric state
  const [op, setOp] = useState<NumericOp>("<");
  const [value, setValue] = useState(30);
  const [value2, setValue2] = useState(70);

  // Boolean state
  const [boolVal, setBoolVal] = useState(true);

  // Sector state
  const [sectors, setSectors] = useState<string[]>([]);

  function handleFieldChange(f: ConditionField) {
    setField(f);
    const m = FIELD_META[f];
    if (m.type === "number") {
      setValue(m.min ?? 0);
      setValue2(m.max ?? 100);
    }
  }

  function handleAdd() {
    if (meta.type === "number") {
      const c: Condition = op === "between"
        ? { field: field as any, op, value, value2 }
        : { field: field as any, op, value };
      onAdd(c);
    } else if (meta.type === "boolean") {
      onAdd({ field: field as any, op: "is", value: boolVal });
    } else {
      if (sectors.length === 0) return;
      onAdd({ field: "sector", op: "in", value: sectors });
    }
  }

  return (
    <div className="rounded-xl border border-accent/30 bg-bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          New Condition
        </span>
        <button type="button" onClick={onCancel} className="flex h-10 w-10 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Field selector */}
      <div className="relative">
        <select
          value={field}
          onChange={(e) => handleFieldChange(e.target.value as ConditionField)}
          className="w-full appearance-none rounded-lg border border-border bg-bg-secondary px-3 py-2 pr-8 text-sm text-text-primary focus:border-accent"
        >
          {(Object.entries(FIELD_META) as [ConditionField, typeof meta][]).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-text-muted" />
      </div>

      {/* Type-specific inputs */}
      {meta.type === "number" && (
        <div className="flex flex-wrap gap-2">
          <select
            value={op}
            onChange={(e) => setOp(e.target.value as NumericOp)}
            className="appearance-none rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-accent"
          >
            <option value="<">Less than</option>
            <option value="<=">At most</option>
            <option value=">">Greater than</option>
            <option value=">=">At least</option>
            <option value="between">Between</option>
          </select>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            step={meta.step}
            min={meta.min}
            max={meta.max}
            className="w-24 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-accent"
          />
          {op === "between" && (
            <>
              <span className="self-center text-xs text-text-muted">and</span>
              <input
                type="number"
                value={value2}
                onChange={(e) => setValue2(Number(e.target.value))}
                step={meta.step}
                min={meta.min}
                max={meta.max}
                className="w-24 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-accent"
              />
            </>
          )}
        </div>
      )}

      {meta.type === "boolean" && (
        <div className="flex gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              onClick={() => setBoolVal(v)}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                boolVal === v
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-bg-secondary text-text-secondary hover:border-accent/30"
              }`}
            >
              {v ? "Yes (Above)" : "No (Below)"}
            </button>
          ))}
        </div>
      )}

      {meta.type === "sector" && (
        <div className="flex flex-wrap gap-1.5">
          {SECTORS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() =>
                setSectors((prev) =>
                  prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
                )
              }
              className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                sectors.includes(s)
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-bg-secondary text-text-muted hover:border-accent/30"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={meta.type === "sector" && sectors.length === 0}
        className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Add Condition
      </button>
    </div>
  );
}
