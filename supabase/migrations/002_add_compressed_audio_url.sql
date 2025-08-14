-- Add compressed_audio_url column to video_records table
-- audio_url: Original quality audio used for video generation
-- compressed_audio_url: Compressed audio used for subtitle generation

ALTER TABLE video_records 
ADD COLUMN compressed_audio_url TEXT;

-- Add comment to the new column
COMMENT ON COLUMN video_records.compressed_audio_url IS 'URL of compressed audio file used for subtitle generation (lower quality, smaller size)';
COMMENT ON COLUMN video_records.audio_url IS 'URL of original quality audio file used for video generation (higher quality for better video output)'; 