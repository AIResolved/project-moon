
import { createClient } from '@/lib/supabase/client'

// Initialize Supabase admin client
const supabaseAdmin = createClient()

/**
 * Uploads a file to Supabase Storage
 * @param filePath Local file path
 * @param destination Destination path in storage
 * @param contentType MIME type of the file
 * @returns Public URL or null if failed
 */
export async function uploadFileToSupabase(
  filePath: string, 
  destination: string, 
  contentType: string
): Promise<string | null> {
  if (!supabaseAdmin) {
    console.error("Supabase Admin client is not initialized. Cannot upload file.");
    return null;
  }

  try {
    const fs = await import('fs/promises');
    const fileBuffer = await fs.readFile(filePath);
    
    const { data, error } = await supabaseAdmin.storage
      .from('audio')
      .upload(destination, fileBuffer, {
        contentType: contentType,
        upsert: true
      });

    if (error) {
      console.error("Error uploading file to Supabase:", error);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('audio')
      .getPublicUrl(destination);

    return publicUrl;

  } catch (err: any) {
    console.error("Error uploading file:", err);
    return null;
  }
}
