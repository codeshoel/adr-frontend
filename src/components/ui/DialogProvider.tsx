"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, Info, X } from "lucide-react";

type DialogKind = "alert" | "confirm" | "prompt";
type Tone = "default" | "danger";

export interface DialogOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: Tone;
  /** prompt only */
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}

interface DialogState extends DialogOptions {
  kind: DialogKind;
  resolve: (value: unknown) => void;
}

interface DialogApi {
  alert: (opts: DialogOptions) => Promise<void>;
  confirm: (opts: DialogOptions) => Promise<boolean>;
  prompt: (opts: DialogOptions) => Promise<string | null>;
}

const DialogContext = createContext<DialogApi | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const open = useCallback(
    (kind: DialogKind, opts: DialogOptions) =>
      new Promise<unknown>((resolve) => {
        setValue(opts.defaultValue ?? "");
        setState({ kind, resolve, ...opts });
      }),
    []
  );

  const api = useMemo<DialogApi>(
    () => ({
      alert: (opts) => open("alert", opts) as Promise<void>,
      confirm: (opts) => open("confirm", opts) as Promise<boolean>,
      prompt: (opts) => open("prompt", opts) as Promise<string | null>,
    }),
    [open]
  );

  const settle = useCallback(
    (result: unknown) => {
      state?.resolve(result);
      setState(null);
      setValue("");
    },
    [state]
  );

  // Resolve with the "cancelled" value for each kind.
  const cancel = useCallback(() => {
    if (!state) return;
    if (state.kind === "confirm") settle(false);
    else if (state.kind === "prompt") settle(null);
    else settle(undefined);
  }, [state, settle]);

  const accept = useCallback(() => {
    if (!state) return;
    if (state.kind === "confirm") settle(true);
    else if (state.kind === "prompt") {
      if (state.required && !value.trim()) return;
      settle(value);
    } else settle(undefined);
  }, [state, settle, value]);

  // Focus the input when a prompt opens.
  useEffect(() => {
    if (state?.kind === "prompt") setTimeout(() => inputRef.current?.focus(), 40);
  }, [state]);

  // Keyboard: Esc cancels, Enter accepts.
  useEffect(() => {
    if (!state) return;
    const s = state;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") cancel();
      if (e.key === "Enter" && s.kind !== "prompt") accept();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [state, cancel, accept]);

  const danger = state?.tone === "danger";

  return (
    <DialogContext.Provider value={api}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          onMouseDown={cancel}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3 p-5">
              <div
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                  danger ? "bg-red-100 text-red-600" : "bg-navy-100 text-navy-600"
                }`}
              >
                {danger ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                {state.title && (
                  <h3 className="text-sm font-bold text-navy-700">{state.title}</h3>
                )}
                {state.message && (
                  <p className="mt-0.5 text-sm text-gray-600 whitespace-pre-line">{state.message}</p>
                )}
                {state.kind === "prompt" && (
                  <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        accept();
                      }
                    }}
                    placeholder={state.placeholder}
                    className="mt-3 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-300"
                  />
                )}
              </div>
              <button onClick={cancel} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100">
              {state.kind !== "alert" && (
                <button
                  onClick={cancel}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-200"
                >
                  {state.cancelText ?? "Cancel"}
                </button>
              )}
              <button
                onClick={accept}
                disabled={state.kind === "prompt" && state.required && !value.trim()}
                className={`px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-40 ${
                  danger ? "bg-red-600 hover:bg-red-700" : "bg-navy-500 hover:bg-navy-600"
                }`}
              >
                {state.confirmText ?? (state.kind === "alert" ? "OK" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within <DialogProvider>");
  return ctx;
}
