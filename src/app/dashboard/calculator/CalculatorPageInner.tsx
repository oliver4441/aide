"use client";

import { useCallback, useEffect, useState } from "react";

type Op = "+" | "-" | "×" | "÷";

const MAX_INPUT_LENGTH = 14;

/** Format a result without floating-point noise (0.1 + 0.2 → 0.3). */
function formatNumber(n: number): string {
  if (!isFinite(n)) return "Error";
  const rounded = Number(n.toPrecision(12));
  return String(rounded);
}

function compute(a: number, b: number, op: Op): number {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

export default function CalculatorPageInner() {
  const [display, setDisplay] = useState("0");
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<Op | null>(null);
  const [expression, setExpression] = useState("");
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const currentValue = () => parseFloat(display.replace(/,/g, "")) || 0;

  const inputDigit = useCallback(
    (d: string) => {
      setCopied(false);
      setDisplay((prev) => {
        const base = justEvaluated || prev === "0" ? "" : prev;
        if (base.replace("-", "").replace(".", "").length >= MAX_INPUT_LENGTH) return prev;
        const next = base + d;
        return next === "" ? "0" : next;
      });
      setJustEvaluated(false);
    },
    [justEvaluated]
  );

  const inputDot = useCallback(() => {
    setCopied(false);
    setDisplay((prev) => {
      if (justEvaluated) return "0.";
      return prev.includes(".") ? prev : `${prev}.`;
    });
    setJustEvaluated(false);
  }, [justEvaluated]);

  const clearAll = useCallback(() => {
    setDisplay("0");
    setAccumulator(null);
    setPendingOp(null);
    setExpression("");
    setJustEvaluated(false);
    setCopied(false);
  }, []);

  const backspace = useCallback(() => {
    setCopied(false);
    if (justEvaluated) {
      clearAll();
      return;
    }
    setDisplay((prev) => {
      const next = prev.length <= 1 || (prev.length === 2 && prev.startsWith("-")) ? "0" : prev.slice(0, -1);
      return next;
    });
  }, [justEvaluated, clearAll]);

  const chooseOp = useCallback(
    (op: Op) => {
      setCopied(false);
      const current = currentValue();
      if (pendingOp !== null && accumulator !== null && !justEvaluated) {
        const result = compute(accumulator, current, pendingOp);
        setAccumulator(result);
        setDisplay(formatNumber(result));
        setExpression(`${formatNumber(result)} ${op}`);
      } else {
        setAccumulator(current);
        setExpression(`${display} ${op}`);
      }
      setPendingOp(op);
      setJustEvaluated(false);
    },
    // `display` is intentionally read via currentValue(); eslint exhaustive-deps
    // is satisfied by including display below.
    [accumulator, pendingOp, justEvaluated, display]
  );

  const equals = useCallback(() => {
    if (pendingOp === null || accumulator === null) return;
    const current = currentValue();
    const result = compute(accumulator, current, pendingOp);
    const formatted = formatNumber(result);
    setHistory((h) => [`${expression} ${display} = ${formatted}`, ...h].slice(0, 10));
    setDisplay(formatted);
    setAccumulator(null);
    setPendingOp(null);
    setExpression("");
    setJustEvaluated(true);
    setCopied(false);
  }, [accumulator, pendingOp, expression, display]);

  const negate = useCallback(() => {
    setCopied(false);
    setDisplay((prev) => (prev.startsWith("-") ? prev.slice(1) : prev === "0" ? prev : `-${prev}`));
  }, []);

  const percent = useCallback(() => {
    setCopied(false);
    setDisplay((prev) => formatNumber((parseFloat(prev) || 0) / 100));
  }, []);

  const copyResult = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(display);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — ignore silently.
    }
  }, [display]);

  // Keyboard support: digits, operators, Enter, Backspace, Escape, dot.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;

      if (/^[0-9]$/.test(e.key)) {
        inputDigit(e.key);
      } else if (e.key === ".") {
        inputDot();
      } else if (e.key === "+") {
        chooseOp("+");
      } else if (e.key === "-") {
        chooseOp("-");
      } else if (e.key === "*") {
        chooseOp("×");
      } else if (e.key === "/") {
        e.preventDefault();
        chooseOp("÷");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        equals();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (e.key === "Escape") {
        clearAll();
      } else if (e.key === "%") {
        percent();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [inputDigit, inputDot, chooseOp, equals, backspace, clearAll, percent]);

  const numBtn =
    "h-14 sm:h-16 rounded-2xl bg-surface-container text-on-surface text-xl font-semibold hover:bg-surface-container-high active:scale-95 transition-all select-none";
  const utilBtn =
    "h-14 sm:h-16 rounded-2xl bg-surface-container-low text-on-surface-variant text-lg font-semibold hover:bg-surface-container active:scale-95 transition-all select-none";
  const opBtn =
    "h-14 sm:h-16 rounded-2xl bg-primary/10 text-primary text-xl font-semibold hover:bg-primary/20 active:scale-95 transition-all select-none";
  const eqBtn =
    "h-14 sm:h-16 rounded-2xl bg-primary text-on-primary text-xl font-bold hover:bg-primary-light active:scale-95 transition-all shadow-lg shadow-primary/20 select-none";

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface font-headline">Calculator</h1>
        <p className="text-on-surface-variant text-sm mt-1">
          Quick maths — works offline. Tap the copy button to paste a result into a sale.
        </p>
      </div>

      {/* Display */}
      <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm text-on-surface-variant h-5 truncate font-mono" aria-live="polite">
              {expression}
            </div>
            <div
              className="text-4xl font-bold text-on-surface font-headline truncate text-right"
              aria-live="polite"
              aria-label={`Calculator display: ${display}`}
            >
              {display}
            </div>
          </div>
          <button
            onClick={copyResult}
            title="Copy result"
            className="shrink-0 mt-1 w-9 h-9 rounded-lg bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors flex items-center justify-center"
          >
            {copied ? (
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* History tape */}
      {history.length > 0 && (
        <div className="mb-4 space-y-1">
          {history.map((entry, i) => (
            <div
              key={`${entry}-${i}`}
              className="text-xs text-on-surface-variant font-mono text-right truncate px-1"
            >
              {entry}
            </div>
          ))}
        </div>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-4 gap-2.5" role="group" aria-label="Calculator keypad">
        <button className={utilBtn} onClick={clearAll} aria-label="Clear">
          C
        </button>
        <button className={utilBtn} onClick={backspace} aria-label="Backspace">
          ⌫
        </button>
        <button className={utilBtn} onClick={percent} aria-label="Percent">
          %
        </button>
        <button className={opBtn} onClick={() => chooseOp("÷")} aria-label="Divide">
          ÷
        </button>

        {["7", "8", "9"].map((d) => (
          <button key={d} className={numBtn} onClick={() => inputDigit(d)}>
            {d}
          </button>
        ))}
        <button className={opBtn} onClick={() => chooseOp("×")} aria-label="Multiply">
          ×
        </button>

        {["4", "5", "6"].map((d) => (
          <button key={d} className={numBtn} onClick={() => inputDigit(d)}>
            {d}
          </button>
        ))}
        <button className={opBtn} onClick={() => chooseOp("-")} aria-label="Subtract">
          −
        </button>

        {["1", "2", "3"].map((d) => (
          <button key={d} className={numBtn} onClick={() => inputDigit(d)}>
            {d}
          </button>
        ))}
        <button className={opBtn} onClick={() => chooseOp("+")} aria-label="Add">
          +
        </button>

        <button className={utilBtn} onClick={negate} aria-label="Toggle sign">
          ±
        </button>
        <button className={numBtn} onClick={() => inputDigit("0")}>
          0
        </button>
        <button className={numBtn} onClick={inputDot} aria-label="Decimal point">
          .
        </button>
        <button className={eqBtn} onClick={equals} aria-label="Equals">
          =
        </button>
      </div>
    </div>
  );
}
