import { z } from "zod";

export const scriptSectionSchema = z.object({
  title: z.string(),
  writingInstructions: z.string(),
  // Required for structured outputs (no optional fields)
  image_generation_prompt: z.string(),
  // Make nullable instead of optional to satisfy OpenAI structured outputs
  wordCount: z.number().nullable()
});

export const scriptSectionsResponseSchema = z.object({
  sections: z.array(scriptSectionSchema)
});

export type ScriptSection = z.infer<typeof scriptSectionSchema>;


