import { NextRequest, NextResponse } from "next/server";
import { createModelInstance } from "../../../../lib/utils/model-factory";

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      sectionPrompt = '',
      additionalContext = '',
      forbiddenWords = '',
      selectedModel = 'gpt-4o-mini',
      wordCount = 2400
    } = await request.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const model = createModelInstance(selectedModel, 0.7);

    // Calculate approximate number of sections based on word count
    const numSections = Math.max(3, Math.ceil(wordCount / 400)); // Roughly 400 words per section

    let prompt = `Generate a titles-only outline for an investigation script with the following parameters:

Title: "${title}"
Target Word Count: ${wordCount} words
Number of Sections: ${numSections}

${sectionPrompt ? `Section Generation Instructions: ${sectionPrompt}\n` : ''}
${additionalContext ? `Additional Context: ${additionalContext}\n` : ''}
${forbiddenWords ? `Forbidden Words (avoid these): ${forbiddenWords}\n` : ''}

Generate ONLY the section titles for this investigation script. Each title should be:
- Clear and compelling
- Appropriate for an investigation/research narrative
- Sequential and logical in flow
- Designed to engage viewers throughout the story

Return exactly ${numSections} titles as a simple JSON array of strings, like this:
["Title 1", "Title 2", "Title 3", ...]

Do not include any explanations, writing instructions, or additional text - ONLY the JSON array of titles.`;

    console.log(`🎬 Generating ${numSections} titles-only outline for: "${title}"`);

    const result = await model.invoke(prompt);
    let responseText = '';
    
    // Handle different response types
    if (typeof result === 'string') {
      responseText = result;
    } else if (result && typeof result === 'object') {
      if ('content' in result && typeof result.content === 'string') {
        responseText = result.content;
      } else if ('text' in result && typeof result.text === 'string') {
        responseText = result.text;
      } else if (Array.isArray(result.content)) {
        responseText = result.content.map((c: any) => c.text || c.content || '').join('');
      } else {
        responseText = JSON.stringify(result);
      }
    }
    
    console.log('Raw AI response for titles:', responseText);

    // Extract JSON array from response
    let titles: string[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        titles = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: try to parse the entire response as JSON
        titles = JSON.parse(responseText);
      }
      
      // Validate that we got an array of strings
      if (!Array.isArray(titles) || titles.length === 0) {
        throw new Error('Invalid titles format');
      }
      
      // Ensure all items are strings and clean them
      titles = titles.filter(t => typeof t === 'string' && t.trim()).map(t => t.trim());
      
      if (titles.length === 0) {
        throw new Error('No valid titles generated');
      }

    } catch (parseError) {
      console.error('Failed to parse titles JSON:', parseError);
      console.error('Response text:', responseText);
      
      // Fallback: extract titles from text format
      const lines = responseText.split('\n').filter(line => line.trim());
      titles = lines
        .filter(line => line.match(/^\d+\.|\-|\•/) || (!line.includes(':') && line.length > 10))
        .map(line => line.replace(/^\d+\.|\-|\•/, '').trim())
        .filter(title => title.length > 0)
        .slice(0, numSections);
        
      if (titles.length === 0) {
        return NextResponse.json({ 
          error: 'Failed to extract titles from AI response' 
        }, { status: 500 });
      }
    }

    console.log(`✅ Generated ${titles.length} titles successfully`);

    return NextResponse.json({
      success: true,
      titles,
      meta: {
        title,
        numSections,
        targetWordCount: wordCount
      }
    });

  } catch (error) {
    console.error('Error generating titles-only outline:', error);
    return NextResponse.json(
      { error: 'Failed to generate titles: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
