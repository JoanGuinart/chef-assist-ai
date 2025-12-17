// app/api/chat/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, info: "chat route ready" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messages = (body as { messages?: Array<{ role: string; content: string }> }).messages ?? [];
    const style = (body as { style?: string }).style || "estándar";
    const twoVariants = (body as { twoVariants?: boolean }).twoVariants ?? false;
    const diet = (body as { diet?: string }).diet?.trim();
    const MODE = (process.env.MODE || "real").toLowerCase();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const HF_KEY = process.env.HF_TOKEN;
    const model = process.env.HUGGINGFACE_MODEL ?? "meta-llama/Llama-3.2-3B-Instruct";
    const baseSystemPrompt = process.env.SYSTEM_PROMPT || "Eres un asistente útil y amable.";

    console.log(`[Chat API] Mode: ${MODE}, Model: ${model}, Style: ${style}, TwoVariants: ${twoVariants}, Diet: ${diet || "ninguna"}`);

    // Build messages with system prompt at the beginning
    const variantsInstruction = twoVariants
      ? "\n\nIMPORTANTE: El usuario solicita 2 VARIANTES COMPLETAS. Entrega 2 recetas completas y separadas, cada una con su título, ingredientes, pasos y alérgenos. No des solo ideas breves."
      : "";

    const styleInstruction = `\n\nEstilo de receta: ${style}. ${style === "rápida y concisa" ? "Formato compacto sin emojis decorativos." : style === "elaborada y detallada" ? "Máximo detalle con técnicas, tiempos precisos y variantes." : "Formato estándar con emojis y estructura clara."}`;

    // Instrucción de dieta FIRME y al inicio
    const dietInstruction = diet 
      ? `\n\n🔴 RESTRICCIÓN DIETARIA ACTIVA: ${diet}\nAdapta TODOS los ingredientes y sustitutos para cumplir estrictamente con: ${diet}\nSi usas ingredientes que violen esta restricción, la respuesta será INCORRECTA.`
      : "";

    const systemPrompt = `${baseSystemPrompt}${dietInstruction}${styleInstruction}${variantsInstruction}`;

    const messagesWithSystem = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    // Demo mode: generate local deterministic markdown without calling any model
    if (MODE === "demo") {
      const body = generateDemoResponse(messages, { style, twoVariants, diet });
      // Banner visible sin interferir con la extracción del título (evitar encabezados ## o ** al inicio)
        const banner = [
          "> 🔴 MODO DEMO: motor de IA simulado; sin tokens ni costes.",
          "> Para usar MODO REAL: clona el repo de mi cuenta de github https://github.com/JoanGuinart/chef-assist-ai, añade HF_TOKEN (con permiso Inference API) y pon MODE=real en .env.local.",
          ""
        ].join("\n");
      const text = `${banner}${body}`;
      return NextResponse.json({ text });
    }

    // If not demo, require HF token
    if (!HF_KEY) {
      return NextResponse.json(
        { error: "No HF_TOKEN en variables de entorno" },
        { status: 500 }
      );
    }

    // Call HuggingFace Router chat/completions endpoint directly
    const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: messagesWithSystem,
        temperature: style === "rápida y concisa" ? 0.3 : 0.7,
        max_tokens: 2000,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error(`[Chat API] Error from HF: ${res.status}`, data);
      return NextResponse.json({ error: data.error || `HF error: ${res.status}` }, { status: res.status });
    }

    // Extract text from response
    const text = data?.choices?.[0]?.message?.content?.trim() || "";

    if (!text) {
      console.warn("[Chat API] Empty response from HF");
      return NextResponse.json({ error: "Empty response from model" }, { status: 500 });
    }

    console.log(`[Chat API] Success: ${text.substring(0, 50)}...`);
    return NextResponse.json({ text });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Chat API] Exception: ${errMsg}`, err);
    return NextResponse.json(
      { error: errMsg },
      { status: 500 }
    );
  }
}

// --- Demo generator ---
function generateDemoResponse(
  messages: Array<{ role: string; content: string }>,
  opts: { style: string; twoVariants: boolean; diet?: string | null }
): string {
  const userLast = messages.filter(m => m.role === "user").at(-1)?.content || "Receta";
  // Remove explicit restriction tag if present and trim
  const cleaned = userLast.replace(/\[RESTRICCIONES DIETÉTICAS:[^\]]+\]/i, "").trim();
  const baseTitle = toTitle(cleaned || "Receta Clásica");
  const titleA = baseTitle;
  const titleB = baseTitle.includes(" ") ? baseTitle.replace(/\s+/, " ") + " (Variante)" : baseTitle + " (Variante)";
  const style = opts.style;
  const diet = (opts.diet || "").trim();

  if (opts.twoVariants) {
    return [
      buildRecipeMarkdown(titleA, style, diet, 1),
      buildRecipeMarkdown(titleB, style, diet, 2)
    ].join("\n\n\n");
  }
  return buildRecipeMarkdown(titleA, style, diet);
}

function toTitle(s: string): string {
  // Basic title casing, keep accents
  return s
    .split(/\s+/)
    .map((w, i) => (i === 0 ? cap(w) : w.toLowerCase()))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function cap(w: string): string {
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function buildRecipeMarkdown(title: string, style: string, diet: string, variantIndex?: number): string {
  const time = style === "rápida y concisa" ? 20 : style === "elaborada y detallada" ? 45 : 30;
  const serves = 4;
  const diff = style === "elaborada y detallada" ? "Media" : "Fácil";

  const dietNote = diet
    ? `\n\n> Adaptada a: **${diet}**`
    : "";

  // Ingredients template respecting diet softly (demo)
  const baseIngredients = [
    "- 250 g de pasta de canelones o espagueti",
    "- 300 g de pollo o ternera (cocido y desmenuzado)",
    "- 1 cebolla y 2 dientes de ajo, picados",
    "- 400 g de tomate triturado",
    "- 2 cucharadas de aceite de oliva",
    "- Sal, pimienta y oréganos al gusto",
    "- 150 g de queso rallado",
  ];

  const adaptedIngredients = adaptIngredients(baseIngredients, diet);

  const stepsCompact = [
    "1. Sofríe cebolla y ajo con aceite 4 min.",
    "2. Añade tomate, hierbas y cocina 8 min.",
    "3. Incorpora la proteína y ajusta sal.",
    "4. Cuece la pasta al dente y mezcla con la salsa.",
    "5. Sirve con queso y un toque de orégano.",
  ];

  const stepsDetailed = [
    "1. Calienta aceite en sartén amplia (fuego medio). Sofríe cebolla y ajo 6–8 min hasta dorar ligero.",
    "2. Agrega tomate triturado, orégano y pimienta. Cocina a fuego suave 12–15 min para reducir.",
    "3. Incorpora la proteína (pollo/ternera) y cocina 5–7 min. Ajusta sal y rectifica acidez con pizca de azúcar si hace falta.",
    "4. Hierve la pasta en abundante agua con sal hasta al dente. Reserva 2–3 cucharadas de agua de cocción.",
    "5. Mezcla la pasta con la salsa, añade el agua de cocción para ligar y termina con el queso.",
    "6. Opcional: gratina 5 min para dorar el queso.",
  ];

  const steps = style === "elaborada y detallada" ? stepsDetailed : stepsCompact;

  const allergens = diet
    ? `\n\n### ⚠️ Alérgenos y Sustitutos\n- Adaptada a **${diet}**. Usa productos certificados según la restricción indicada.`
    : "";

  const variants = variantIndex ? `\n\n### 🔄 Variantes\n- Esta es la variante ${variantIndex}. Cambia la proteína o añade verduras asadas.` : "";

  return [
    `## 🍽️ ${title}`,
    `⏱️ **Tiempo**: ${time} min | 🍽️ **Raciones**: ${serves} | ⭐ **Dificultad**: ${diff}`,
    dietNote,
    "\n### 📝 Ingredientes",
    ...adaptedIngredients,
    "\n### 👨‍🍳 Preparación",
    ...steps,
    allergens,
    variants,
  ].filter(Boolean).join("\n");
}

function adaptIngredients(list: string[], diet: string): string[] {
  if (!diet) return list;
  const d = diet.toLowerCase();
  return list.map(line => {
    let out = line;
    if (d.includes("sin gluten")) {
      out = out.replace(/pasta[^,]*/i, "pasta certificada sin gluten");
      out = out.replace(/harina/i, "harina sin gluten");
    }
    if (d.includes("sin lactosa") || d.includes("vegana")) {
      out = out.replace(/queso rallado/i, d.includes("vegana") ? "queso vegetal rallado" : "queso sin lactosa");
    }
    if (d.includes("sin nueces")) {
      out = out.replace(/nuez|nueces/gi, "(sin nueces)");
    }
    if (d.includes("fodmap")) {
      out = out.replace(/cebolla/i, "cebolla verde (parte verde) o cebolleta");
      out = out.replace(/ajo/i, "aceite infusionado con ajo (sin sólidos)");
    }
    return out;
  });
}
