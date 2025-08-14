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
      audience = 'general',
      povSelection = '3rd',
      forbiddenWords = '',
      additionalPrompt = '',
      researchContext = ''
    } = await request.json();

    if (!title || !Array.isArray(sections) || sections.length === 0) {
      return NextResponse.json({ error: 'Missing title or sections' }, { status: 400 });
    }

    const model: any = createModelInstance(selectedModel, 0.7);

    const logsDir = join(process.cwd(), 'logs');
    if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

    const detailedSections: Array<{ index: number; title: string; detailedContent: string; wordCount: number }> = [];

    for (let index = 0; index < sections.length; index++) {
      const sec = sections[index];
      const prevTitle = sections[index - 1]?.title || '';
      const nextTitle = sections[index + 1]?.title || '';
      const prevContent = detailedSections[index - 1]?.detailedContent || '';

      const system = 'You write ethical, respectful true-crime narrative suitable for spoken delivery. Output only the script text (no headings or labels).';

      const user = `Write the ${index + 1}/${sections.length} section of a true-crime documentary script for "${title}".

SECTION TITLE: ${sec.title}
WRITING INSTRUCTIONS:\n${sec.writingInstructions}

CONSTRAINTS AND TONE:
- Respect victims and families; avoid sensationalism
- No graphic descriptions; be objective and compassionate
- Use ${povSelection === '1st' ? 'first' : povSelection === '2nd' ? 'second' : 'third'} person narration
- Audience: ${audience}
- Avoid: ${forbiddenWords || 'none'}
${researchContext ? `- Incorporate relevant facts from research when helpful\n` : ''}

COHERENCE:
- Previous section title: ${prevTitle}
${prevContent ? `- Previous section summary: ${prevContent.substring(0, 800)}\n` : ''}- Next section title: ${nextTitle}

DELIVERY:
- No headings or meta commentary; only narrative text
- Vary sentence structure; avoid repetitive phrasing
- Integrate dates, names, locations when relevant and known
${additionalPrompt ? `\nADDITIONAL INSTRUCTIONS:\n${additionalPrompt}` : ''}`;

      const messages = [
        { role: 'system' as const, content: system },
        { role: 'user' as const, content: user }
      ];

      const result = await model.invoke(messages);
      let content = '';
      if (typeof result.content === 'string') content = result.content;
      else if (Array.isArray(result.content)) content = result.content.map((i: any) => (typeof i === 'string' ? i : (i?.text || ''))).join('\n');
      content = (content || '').trim();
      const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
      detailedSections.push({ index, title: sec.title, detailedContent: content, wordCount });

      const fname = join(logsDir, `true_crime_full_${index + 1}_${Date.now()}.txt`);
      writeFileSync(fname, user + "\n\n---\n\n" + content, 'utf-8');
    }

    const scriptWithMarkdown = detailedSections
      .map(s => `**${s.title}**\n\n${s.detailedContent}`)
      .join("\n\n");

    return NextResponse.json({ success: true, detailedSections, scriptWithMarkdown, wordCount: scriptWithMarkdown.split(/\s+/).filter(Boolean).length });
  } catch (error) {
    console.error('Error generating true-crime full script:', error);
    return NextResponse.json({ error: 'Failed to generate true-crime full script' }, { status: 500 });
  }
}



