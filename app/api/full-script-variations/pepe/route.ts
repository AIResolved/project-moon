import { NextRequest, NextResponse } from "next/server";
import { createModelInstance } from "../../../../lib/utils/model-factory";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      sections = [],
      selectedModel = 'gpt-4o-mini',
      emotionalTone = '',
      targetAudience = '',
      forbiddenWords = '',
      additionalPrompt = ''
    } = await request.json();

    if (!title || !Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json({ error: 'Missing title or sections' }, { status: 400 });
    }

    const model: any = createModelInstance(selectedModel, 0.7);

    const logsDir = join(process.cwd(), 'logs');
    if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

    const detailedSections: Array<{ index: number; title: string; detailedContent: string; wordCount: number }> = [];

    for (let idx = 0; idx < sections.length; idx++) {
      const section = sections[idx];
      const previous = detailedSections[idx - 1]?.detailedContent || '';
      const prevTitle = sections[idx - 1]?.title || '';
      const nextTitle = sections[idx + 1]?.title || '';

      const system = `You are a master storyteller and researcher writing natural, authentic spoken content. Output only the script text (no titles or stage directions).`;

      const user = `Write this section for the video script titled "${title}":

SECTION TITLE: ${section.title}
WRITING INSTRUCTIONS:
${section.writingInstructions}

CONTEXT:
- Emotional tone: ${emotionalTone || 'balanced'}
- Audience: ${targetAudience || 'general'}
- Forbidden words: ${forbiddenWords || 'none'}
- Previous section title: ${prevTitle}
${previous ? `- Previous section content: ${previous.substring(0, 1200)}
` : ''}- Next section title: ${nextTitle}

GENERAL REQUIREMENTS:
- Avoid AI-ish repetition and formulaic phrasing
- Vary sentence structure and rhythm
- Integrate concrete examples and evidence when useful
- Flow naturally from the previous content; set up the next
- Do not include headers, "Section" markers, or meta commentary
${additionalPrompt ? `
ADDITIONAL INSTRUCTIONS:
${additionalPrompt}
` : ''}`;

      const messages = [
        { role: 'system' as const, content: system },
        { role: 'user' as const, content: user }
      ];

      const result = await model.invoke(messages);
      let content = '';
      if (typeof result.content === 'string') content = result.content;
      else if (Array.isArray(result.content)) {
        content = result.content.map((i: any) => (typeof i === 'string' ? i : (i?.text || ''))).join('\n');
      }
      content = (content || '').trim();
      const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
      detailedSections.push({ index: idx, title: section.title, detailedContent: content, wordCount });

      const fname = join(logsDir, `pepe_full_section_${idx + 1}_${Date.now()}.txt`);
      writeFileSync(fname, user + "\n\n---\n\n" + content, 'utf-8');
    }

    const scriptWithMarkdown = detailedSections
      .map(s => `**${s.title}**\n\n${s.detailedContent}`)
      .join("\n\n");

    return NextResponse.json({ success: true, detailedSections, scriptWithMarkdown, wordCount: scriptWithMarkdown.split(/\s+/).filter(Boolean).length });
  } catch (error) {
    console.error('Error generating pepe full script:', error);
    return NextResponse.json({ error: 'Failed to generate pepe full script' }, { status: 500 });
  }
}






