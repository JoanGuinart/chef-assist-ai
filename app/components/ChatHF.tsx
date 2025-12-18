"use client";

// Importar librerías: React y sus hooks, además de ReactMarkdown para renderizar contenido en markdown
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

// Define la estructura de un mensaje con rol (usuario o asistente), contenido e identificador único
type Message = {
  role: "user" | "assistant";
  content: string;
  id: string;
};

// Array de sugerencias rápidas que el usuario puede seleccionar con un click
const quickFilters = [
  "Cena rápida sin gluten",
  "Idea vegana proteica",
  "Postre sin lactosa fácil",
  "Batch cooking saludable",
];

// Filtros adicionales para añadir variantes a las recetas
const variantFilters = ["Incluye alternativa sin nueces", "Versión para niños"];

// Presets que definen diferentes estilos de recetas: breve, clásica o elaborada
const presets = {
  breve: { style: "rápida y concisa", label: "Receta breve" },
  clasica: { style: "estándar", label: "Receta clásica" },
  elaborada: { style: "elaborada y detallada", label: "Receta elaborada" },
} as const;

// Tipo que asegura que solo se usen las claves válidas de presets
type PresetKey = keyof typeof presets;

// Componente principal del asistente de recetas
export default function ChatHF() {
  // Array de mensajes del chat (inicializa con un mensaje de bienvenida)
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
  // Estado para saber si se inició una nueva receta (para mostrar en el encabezado)
  const [isNewRecipe, setIsNewRecipe] = useState(false);
  // Estado para guardar el nombre de la receta actual
  const [currentRecipeName, setCurrentRecipeName] = useState<string | null>(
    null
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Memoriza el preset actual para evitar cálculos innecesarios
  const preset = useMemo(() => presets[lengthPreset], [lengthPreset]);

  // Efecto para hacer scroll automático al final del chat cuando hay nuevos mensajes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Función para enviar el mensaje al API y recibir la respuesta del asistente
  const send = async () => {
    // Elimina espacios al inicio y final del input
    const trimmed = input.trim();
    // Si el input está vacío o ya se está cargando, no hacer nada
    if (!trimmed || loading) return;

    // Captura los valores actuales de dieta y opciones ANTES de resetear
    const currentDiet = diet;
    const currentPreset = preset;
    const currentWantsTwoVariants = wantsTwoVariants;

    // Resetea los filtros INMEDIATAMENTE para evitar que afecten al siguiente envío
    setDiet([]);
    setLengthPreset("clasica");
    setWantsTwoVariants(false);

    // Crea el contenido del mensaje con restricciones dietéticas si existen
    let messageContent = trimmed;
    if (currentDiet.length > 0) {
      messageContent = `${trimmed}\n\n[RESTRICCIONES DIETÉTICAS: ${currentDiet.join(
        ", "
      )}]`;
    }

    // Crea el objeto del mensaje del usuario
    const userMessage: Message = {
      role: "user",
      content: messageContent,
      id: `u-${Date.now()}`,
    };

    // Combina los mensajes anteriores con el nuevo mensaje del usuario
    const nextMessages = [...messages, userMessage];
    // Actualiza los mensajes en el UI y limpia el input
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    // Resetea el indicador de nueva receta cuando se envía un mensaje
    setIsNewRecipe(false);

    // Intenta enviar la solicitud al API y manejar respuestas/errores
    try {
      // Construye el objeto de datos a enviar al API usando los valores capturados
      const payload: Record<string, unknown> = {
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        style: currentPreset.style,
        twoVariants: currentWantsTwoVariants,
      };
      // Si hay dietas seleccionadas, las añade al payload
      if (currentDiet.length) payload.diet = currentDiet.join(", ");

      // Envía la solicitud POST al API del chat
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Intenta parsear la respuesta JSON, si falla devuelve un objeto vacío
      const data = await res.json().catch(() => ({}));

      // Si hay error en la respuesta o no hay texto, muestra un mensaje de error
      if (!res.ok || !data?.text) {
        const errorMsg = data?.error || "No pude generar la respuesta";
        // Añade el mensaje de error al chat
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

      // Si la respuesta es válida, añade el mensaje del asistente al chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.text,
          id: `a-${Date.now()}`,
        },
      ]);

      // Extrae el nombre de la receta del markdown (formato: ## [Nombre] con o sin emoji o **[Nombre]**)
      // Intenta primero con formato ## (markdown heading)
      let recipeMatch = data.text.match(/##\s*(?:🍽️\s*)?(.+?)(?:\n|$)/);

      // Si no encuentra, busca título en negrita al principio de la respuesta
      if (!recipeMatch) {
        recipeMatch = data.text.match(/^\*\*(.+?)\*\*/);
      }

      if (recipeMatch && recipeMatch[1]) {
        const recipeName = recipeMatch[1].trim();
        setCurrentRecipeName(recipeName);
      } else {
        // Si no encuentra el título, intenta extraerlo de otra forma
        const lines = data.text.split("\n");
        const titleLine: string | undefined = lines.find((line: string) =>
          line.trim().startsWith("##")
        );
        if (titleLine) {
          const recipeName = titleLine.replace(/^##\s*(?:🍽️\s*)?/, "").trim();
          setCurrentRecipeName(recipeName);
        }
      }
    } catch (err) {
      // Obtiene el mensaje de error
      const errMsg = err instanceof Error ? err.message : String(err);
      // Añade el mensaje de error al chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Disculpa, algo falló: ${errMsg}`,
          id: `e-${Date.now()}`,
        },
      ]);
    } finally {
      // Detiene el loading cuando termina la solicitud
      setLoading(false);
    }
  };

  // Estructura principal del componente
  return (
    // Contenedor principal con fondo gradiente
    <div className="h-screen max-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Contenedor con ancho máximo y distribución de contenido */}
      <div className="mx-auto max-w-3xl h-full px-3 py-4 md:px-4 md:py-8 flex flex-col">
        {/* Encabezado con título y estado online */}
        <div className="mb-3 md:mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs md:text-sm text-slate-300">
              Chef Assist · Cocina adaptada
            </p>
            <h1 className="text-lg md:text-2xl font-semibold text-white">
              Asistente de Recetas
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </div>
            {/* Botón para limpiar el historial y empezar una nueva receta */}
            <button
              onClick={() => {
                setMessages([
                  {
                    role: "assistant",
                    content:
                      "Hola! Soy tu asistente de cocina. ¿Qué receta adaptada necesitas?",
                    id: "m0",
                  },
                ]);
                setIsNewRecipe(true);
                setCurrentRecipeName(null);
              }}
              className="text-[10px] md:text-xs px-2 py-1 md:px-3 md:py-1.5 rounded-full border border-white/20 bg-white/5 hover:border-white/40 transition"
              title="Limpia el historial de chat y comienza una nueva receta"
            >
              Nueva Receta
            </button>
          </div>
        </div>

        {/* Título de la receta actual (aparece cuando hay una receta) */}
        {currentRecipeName && (
          <div className="mb-3 md:mb-4 text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-1 md:mb-2">
              {currentRecipeName}
            </h2>
            <p className="text-xs md:text-sm text-slate-400">
              ¿Quieres otra receta distinta? Haz click en{" "}
              <span
                className="text-emerald-300 font-semibold cursor-pointer hover:underline"
                onClick={() => {
                  setMessages([
                    {
                      role: "assistant",
                      content:
                        "Hola! Soy tu asistente de cocina. ¿Qué receta adaptada necesitas?",
                      id: "m0",
                    },
                  ]);
                  setIsNewRecipe(true);
                  setCurrentRecipeName(null);
                }}
              >
                Nueva Receta
              </span>
            </p>
            <span className="text-[8px]">
              Si no haces clic en “nueva receta”, el asistente del chat seguirá
              usando el contexto de la primera receta solicitada, lo que puede
              provocar errores en las respuestas.
            </span>
          </div>
        )}

        {isNewRecipe && !currentRecipeName && (
          <div className="mb-4 text-center">
            <p className="text-lg text-emerald-300">
              ✨ Chat limpio - Comienza una nueva receta
            </p>
          </div>
        )}

        {/* Contenedor principal del chat */}
        <div className="flex-1 overflow-auto rounded-2xl md:rounded-3xl border border-white/5 bg-white/5 backdrop-blur p-2 md:p-4 shadow-xl flex flex-col">
          {/* Área de mensajes con scroll automático */}
          <div
            ref={scrollRef}
            className="space-y-4 flex-1 pr-1 overflow-auto scrollbar-dark"
          >
            {/* Renderiza cada mensaje en el chat */}
            {messages.map((m) => (
              // Contenedor del mensaje alineado según el rol
              <div
                key={m.id}
                className={
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                {/* Burbuja del mensaje con estilos diferentes según el rol */}
                <div
                  className={`relative max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm border ${
                    m.role === "user"
                      ? "bg-indigo-500 text-white border-indigo-400"
                      : "bg-slate-900 text-slate-50 border-white/10"
                  }`}
                >
                  {/* Si es mensaje del asistente, renderiza markdown y botón copiar */}
                  {m.role === "assistant" ? (
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="prose prose-invert max-w-none prose-p:my-1 prose-li:my-1">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      </div>
                      {/* Botón para copiar el contenido del asistente */}
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
                    /* Si es mensaje del usuario, lo renderiza como texto plano */ <pre className="whitespace-pre-wrap text-sm font-medium">
                      {m.content}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Sección de sugerencias rápidas */}
          <div className="mt-2 md:mt-4 flex flex-wrap gap-1.5 md:gap-2">
            {/* Botones con sugerencias rápidas para recetas */}
            {quickFilters.map((f) => (
              <button
                key={f}
                onClick={() => setInput(f)}
                className="text-[10px] md:text-xs px-2 py-1.5 md:px-3 md:py-2 rounded-full border border-white/15 bg-white/5 hover:border-white/30 transition"
                disabled={loading}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Sección de filtros de variantes */}
          <div className="mt-1.5 md:mt-2 flex flex-wrap gap-1.5 md:gap-2">
            {/* Botones para añadir variantes a las recetas */}
            {variantFilters.map((f) => (
              <button
                key={f}
                onClick={() => setInput((prev) => (prev ? `${prev}. ${f}` : f))}
                className="text-[10px] md:text-xs px-2 py-1.5 md:px-3 md:py-2 rounded-full border border-white/15 bg-white/5 hover:border-white/30 transition"
                disabled={loading}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Sección de selección de dietas */}
          <div className="mt-2 md:mt-3 flex flex-wrap items-center gap-1.5 md:gap-3 text-[10px] md:text-xs text-slate-200">
            {/* Botones para seleccionar diferentes tipos de dietas */}
            <span className="font-semibold text-slate-100 text-[10px] md:text-xs">Dieta:</span>
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
                className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full border transition text-[10px] md:text-xs ${
                  diet.includes(d)
                    ? "bg-emerald-500 text-white border-emerald-400"
                    : "border-white/20 bg-white/5 hover:border-white/40"
                }`}
                disabled={loading}
              >
                {d}
              </button>
            ))}
            {/* Botón para limpiar todas las dietas seleccionadas */}
            <button
              onClick={() => setDiet([])}
              className="text-[11px] underline text-slate-300 cursor-pointer hover:text-slate-100 transition"
              disabled={loading}
            >
              Limpiar dieta
            </button>
          </div>

          {/* Sección para seleccionar si quiere 2 variantes de la receta */}
          <div className="mt-2 md:mt-3 flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs text-slate-200">
            <label className="flex items-center gap-1.5 md:gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={wantsTwoVariants}
                onChange={(e) => setWantsTwoVariants(e.target.checked)}
                disabled={loading}
                className="w-3.5 h-3.5 md:w-4 md:h-4 rounded border-white/20 bg-white/5"
              />
              <span className="font-semibold text-slate-100 text-[10px] md:text-xs">
                Dame 2 variantes completas
              </span>
            </label>
          </div>

          {/* Sección para elegir el formato de la receta */}
          <div className="mt-2 md:mt-4 flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs text-slate-200">
            {/* Botones de radio para seleccionar el preset (breve, clásica, elaborada) */}
            <span className="font-semibold text-slate-100 text-[10px] md:text-xs">Formato:</span>
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

          {/* Sección final: input y botón de envío */}
          <div className="mt-3 md:mt-4 flex gap-2 md:gap-3">
            {/* Input de texto para escribir las solicitudes */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Pide una receta adaptada..."
              className="flex-1 rounded-xl md:rounded-2xl border border-white/10 bg-white/5 px-3 py-2 md:px-4 md:py-3 text-xs md:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
            />
            {/* Botón para enviar el mensaje */}
            <button
              onClick={send}
              disabled={loading}
              className="rounded-xl md:rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold px-3 md:px-4 text-xs md:text-sm min-w-[70px] md:min-w-22.5 transition disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
