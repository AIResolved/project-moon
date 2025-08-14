import { NextRequest, NextResponse } from "next/server";
import { scriptSectionsResponseSchema } from "../../../../types/script-section";
import { createModelInstance } from "../../../../lib/utils/model-factory";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      additionalContext = "",
      forbiddenWords = "",
      selectedModel = "gpt-4o-mini",
      wordCount = 2400
    } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Missing required field: title" }, { status: 400 });
    }

    // Sections by desired word count (~800 words per section)
    const numSections = Math.max(1, Math.ceil((Number(wordCount) || 2400) / 800));

    // Style fallback
    const stylePath = join(process.cwd(), 'lib', 'data', 'feeder_script_style.txt');
    const styleContent = readFileSync(stylePath, 'utf-8');

    const model = createModelInstance(selectedModel, 0.7) as any;

    const forbid = forbiddenWords
      ? `\nFORBIDDEN WORDS: Avoid: ${forbiddenWords}.`
      : "";

    const context = additionalContext
      ? `\nADDITIONAL CONTEXT:\n${additionalContext}\n`
      : "";

    const prompt = `You are an investigative documentary script architect. Create a clear, multi-section outline that uncovers a mystery with evidence-driven progression.

TITLE: "${title}"
TARGET SECTIONS: ${numSections}

STYLE & PRINCIPLES:\n${styleContent}

INVESTIGATIVE APPROACH:
- Open with the most compelling question or anomaly
- Build the investigation through verified facts, sources, timelines
- Present contradictions and alternative explanations before resolution
- Use suspense via progressive revelation, not sensationalism
- Maintain objectivity; separate evidence from speculation
- Include specific dates, names, locations when applicable

STRUCTURE GUIDELINES (each section):
1) A specific section title
2) Detailed writing instructions (150-250 words) covering: key facts to present, sources to reference, questions to raise, what is revealed here, and how this section advances the investigation
3) A short image_generation_prompt (10-25 words) that visually matches this section’s content (no taboo/sensitive content)

${context}${forbid}

Return ONLY a JSON object matching this format: ${scriptSectionsResponseSchema.toString()}`;

    // Persist prompt for debugging
    const logsDir = join(process.cwd(), 'logs');
    if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
    const filename = join(logsDir, `investigation_outline_${Date.now()}.txt`);
    writeFileSync(filename, prompt, 'utf-8');

    const response = await model.withStructuredOutput(scriptSectionsResponseSchema).invoke(prompt);

    return NextResponse.json({ success: true, sections: response.sections });
  } catch (error) {
    console.error('Error generating investigation outline:', error);
    return NextResponse.json({ error: 'Failed to generate investigation outline' }, { status: 500 });
  }
}


