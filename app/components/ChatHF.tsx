"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type Message = {
  role: "user" | "assistant";
  content: string;
  id: string;
};

const quickFilters = [
  "Cena rápida sin gluten",
  "Idea vegana proteica",
  "Postre sin lactosa fácil",
  "Batch cooking saludable",
];

const variantFilters = [
  "Incluye alternativa sin nueces",
  "Versión para niños",
];

const presets = {
  breve: { style: "rápida y concisa", label: "Receta breve" },
  clasica: { style: "estándar", label: "Receta clásica" },
  elaborada: { style: "elaborada y detallada", label: "Receta elaborada" },
} as const;

type PresetKey = keyof typeof presets;

export default function ChatHF() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hola! Soy tu asistente de cocina. ¿Qué receta adaptada necesitas?",
      id: "m0",
    },
  ]);
  const [input, setInput] = useState("");
  const [diet, setDiet] = useState<string[]>([]);
  const [lengthPreset, setLengthPreset] = useState<PresetKey>("clasica");
  const [wantsTwoVariants, setWantsTwoVariants] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const preset = useMemo(() => presets[lengthPreset], [lengthPreset]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      role: "user",
      content: trimmed,
      id: `u-${Date.now()}`,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        style: preset.style,
        twoVariants: wantsTwoVariants,
      };
      if (diet.length) payload.diet = diet.join(", ");

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.text) {
        const errorMsg = data?.error || "No pude generar la respuesta";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Disculpa, algo falló: ${errorMsg}`,
            id: `e-${Date.now()}`,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.text,
          id: `a-${Date.now()}`,
        },
      ]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Disculpa, algo falló: ${errMsg}`,
          id: `e-${Date.now()}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto max-w-3xl h-full px-4 py-8 flex flex-col">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300">
              Chef Assist · Cocina adaptada
            </p>
            <h1 className="text-2xl font-semibold text-white">
              Asistente de Recetas
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-emerald-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded-3xl border border-white/5 bg-white/5 backdrop-blur p-4 shadow-xl flex flex-col">
          <div ref={scrollRef} className="space-y-4 flex-1 pr-1 overflow-auto scrollbar-dark">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <div
                  className={`relative max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm border ${
                    m.role === "user"
                      ? "bg-indigo-500 text-white border-indigo-400"
                      : "bg-slate-900 text-slate-50 border-white/10"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <ReactMarkdown className="prose prose-invert max-w-none prose-p:my-1 prose-li:my-1">
                          {m.content}
                        </ReactMarkdown>
                      </div>
                      {m.id !== "m0" && (
                        <button
                          className="text-[11px] h-fit bg-white/10 px-2 py-1 rounded border border-white/20 hover:border-white/40"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(m.content);
                            } catch (e) {
                              console.error("Clipboard error", e);
                            }
                          }}
                          aria-label="Copiar receta"
                        >
                          Copiar
                        </button>
                      )}
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm font-medium">
                      {m.content}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {quickFilters.map((f) => (
              <button
                key={f}
                onClick={() => setInput(f)}
                className="text-xs px-3 py-2 rounded-full border border-white/15 bg-white/5 hover:border-white/30 transition"
                disabled={loading}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {variantFilters.map((f) => (
              <button
                key={f}
                onClick={() => setInput((prev) => (prev ? `${prev}. ${f}` : f))}
                className="text-xs px-3 py-2 rounded-full border border-white/15 bg-white/5 hover:border-white/30 transition"
                disabled={loading}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-200">
            <span className="font-semibold text-slate-100">Dieta:</span>
            {[
              "Sin gluten",
              "Vegana",
              "Sin lactosa",
              "Sin nueces",
              "Baja en FODMAP",
            ].map((d) => (
              <button
                key={d}
                onClick={() =>
                  setDiet((prev) =>
                    prev.includes(d)
                      ? prev.filter((x) => x !== d)
                      : [...prev, d]
                  )
                }
                className={`px-3 py-1 rounded-full border transition ${
                  diet.includes(d)
                    ? "bg-emerald-500 text-white border-emerald-400"
                    : "border-white/20 bg-white/5 hover:border-white/40"
                }`}
                disabled={loading}
              >
                {d}
              </button>
            ))}
            <button
              onClick={() => setDiet([])}
              className="text-[11px] underline text-slate-300 cursor-pointer hover:text-slate-100 transition"
              disabled={loading}
            >
              Limpiar dieta
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={wantsTwoVariants}
                onChange={(e) => setWantsTwoVariants(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 rounded border-white/20 bg-white/5"
              />
              <span className="font-semibold text-slate-100">Dame 2 variantes completas</span>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-200">
            <span className="font-semibold text-slate-100">Formato:</span>
            {Object.entries(presets).map(([key, value]) => (
              <label
                key={key}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="preset"
                  value={key}
                  checked={lengthPreset === key}
                  onChange={() => setLengthPreset(key as PresetKey)}
                />
                {value.label}
              </label>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Pide una receta adaptada..."
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
            />
            <button
              onClick={send}
              disabled={loading}
              className="rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-4 min-w-22.5 transition disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
