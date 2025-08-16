import { NextRequest, NextResponse } from "next/server";
import { createModelInstance } from "../../../lib/utils/model-factory";

export async function POST(req: NextRequest) {
  try {
    const { messages = [], context = {} } = await req.json();

    const model = createModelInstance("gpt-4o-mini", 0.7) as any;

    const system = `You are a helpful research assistant for script generation.
Keep responses concise, specific, and practical. Prefer bullet lists.
Avoid markdown headers; plain text is fine. If user asks for hooks, suggest 3-5 options.
When relevant, incorporate provided context, but do not fabricate details.`;

    const contextText = Object.entries(context || {})
      .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
      .map(([k, v]) => `${k}: ${String(v).trim()}`)
      .join("\n");

    const chat = [
      { role: "system", content: system },
      ...(contextText ? [{ role: "system", content: `Context:\n${contextText}` }] : []),
      ...messages.map((m: any) => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.content || "") })),
    ];

    const result = await model.invoke(chat);

    const reply = typeof result === "string"
      ? result
      : (result?.content ?? result?.output_text ?? JSON.stringify(result));

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("research-assistant error", err);
    return NextResponse.json({ error: "Assistant failed" }, { status: 500 });
  }
}


