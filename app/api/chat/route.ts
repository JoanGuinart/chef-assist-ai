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

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const HF_KEY = process.env.HF_TOKEN;
    const model = process.env.HUGGINGFACE_MODEL ?? "meta-llama/Llama-3.2-3B-Instruct";
    const baseSystemPrompt = process.env.SYSTEM_PROMPT || "Eres un asistente útil y amable.";

    if (!HF_KEY) {
      return NextResponse.json(
        { error: "No HF_TOKEN en variables de entorno" },
        { status: 500 }
      );
    }

    console.log(`[Chat API] Model: ${model}, Style: ${style}, TwoVariants: ${twoVariants}`);

    // Build messages with system prompt at the beginning
    const variantsInstruction = twoVariants
      ? "\n\nIMPORTANTE: El usuario solicita 2 VARIANTES COMPLETAS. Entrega 2 recetas completas y separadas, cada una con su título, ingredientes, pasos y alérgenos. No des solo ideas breves."
      : "";

    const styleInstruction = `\n\nEstilo de receta: ${style}. ${style === "rápida y concisa" ? "Formato compacto sin emojis decorativos." : style === "elaborada y detallada" ? "Máximo detalle con técnicas, tiempos precisos y variantes." : "Formato estándar con emojis y estructura clara."}`;

    const systemPrompt = `${baseSystemPrompt}${styleInstruction}${variantsInstruction}`;

    const userDietInstruction = diet ? `
El usuario solicita esta adaptación dietaria: ${diet}. Ajusta ingredientes y sustitutos para respetarla.` : "";

    const messagesWithSystem = [
      { role: "system", content: `${systemPrompt}${userDietInstruction}` },
      ...messages,
    ];

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
