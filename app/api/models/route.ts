import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    const models = await openai.models.list();
    
    const popularModels = [
      { id: 'gpt-5', owned_by: 'openai' },
      { id: 'gpt-5-mini', owned_by: 'openai' },
      { id: 'gpt-5-nano', owned_by: 'openai' },
      { id: 'gpt-4o', owned_by: 'openai' },
      { id: 'gpt-4o-mini', owned_by: 'openai' },
      { id: 'gpt-4.1', owned_by: 'openai' },
      { id: 'gpt-4.1-mini', owned_by: 'openai' },
      { id: 'gpt-4.1-nano', owned_by: 'openai' },
    ];

    const anthropicModels = [
        { id: 'claude-opus-4-20250514', owned_by: 'anthropic' },
        { id: 'claude-sonnet-4-20250514', owned_by: 'anthropic' },
        { id: 'claude-3-7-sonnet-20250219', owned_by: 'anthropic' },
    ];

   
    const combined = [...popularModels, ...anthropicModels];
    const uniqueModels = combined.filter(
      (model, idx, arr) => arr.findIndex(m => m.id === model.id) === idx
    );

    return NextResponse.json(uniqueModels);
  } catch (error) {
    console.error('Error fetching OpenAI models:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
} 