import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function uploadFileToSupabase(
  filePathOrBuffer: string | Buffer,
  destinationPath: string,
  contentType: string
): Promise<string | null> {
  try {
    let fileBuffer: Buffer

    // Handle both file path and buffer inputs
    if (typeof filePathOrBuffer === 'string') {
      // It's a file path
      fileBuffer = await fs.readFile(filePathOrBuffer)
    } else {
      // It's already a buffer
      fileBuffer = filePathOrBuffer
    }

    const { data, error } = await supabase.storage
      .from('audio')
      .upload(destinationPath, fileBuffer, {
        contentType,
        upsert: true
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return null
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('audio')
      .getPublicUrl(destinationPath)

    return publicUrlData.publicUrl
  } catch (error) {
    console.error('Error uploading to Supabase:', error)
    return null
  }
} 