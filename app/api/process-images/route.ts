import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import sharp from 'sharp'

// Helper function to check if file is an image
function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext))
}

// Helper function to check if file should be skipped
function shouldSkipFile(filename: string): boolean {
  // Skip macOS metadata files
  if (filename.includes('__MACOSX/') || filename.includes('/._')) {
    return true
  }
  
  // Skip files that start with ._ (macOS resource forks)
  const basename = filename.split('/').pop() || ''
  if (basename.startsWith('._')) {
    return true
  }
  
  // Skip hidden files
  if (basename.startsWith('.')) {
    return true
  }
  
  return false
}

// Helper function to extract chapter and image numbers from filename
function extractChapterAndImageNumber(filename: string): { chapter: number, image: number, sortKey: string } {
  const pathParts = filename.split('/')
  const basename = pathParts[pathParts.length - 1] || filename
  const nameWithoutExt = basename.replace(/\.[^/.]+$/, '')
  
  // Try different patterns to extract chapter and image numbers
  
  // Pattern 1: Folder-based chapters - "Chapter1/01.png", "Ch2/image5.jpg", etc.
  if (pathParts.length > 1) {
    const folderName = pathParts[pathParts.length - 2] // Get the immediate parent folder
    
    // Extract chapter from folder name
    const folderChapterMatch = folderName.match(/(?:chapter|ch|part|section)[\s_-]*(\d+)/i)
    if (folderChapterMatch) {
      const chapter = parseInt(folderChapterMatch[1])
      
      // Extract image number from filename
      const fileImageMatch = nameWithoutExt.match(/(?:image|img|pic|photo)?[\s_-]*(\d+)/) || nameWithoutExt.match(/^(\d+)/)
      const image = fileImageMatch ? parseInt(fileImageMatch[1]) : 1
      
      return { 
        chapter, 
        image, 
        sortKey: `${chapter.toString().padStart(3, '0')}_${image.toString().padStart(4, '0')}` 
      }
    }
    
    // Try numeric folder names (e.g., "1/image.jpg", "02/pic.png")
    const numericFolderMatch = folderName.match(/^(\d+)$/)
    if (numericFolderMatch) {
      const chapter = parseInt(numericFolderMatch[1])
      
      // Extract image number from filename
      const fileImageMatch = nameWithoutExt.match(/(?:image|img|pic|photo)?[\s_-]*(\d+)/) || nameWithoutExt.match(/^(\d+)/)
      const image = fileImageMatch ? parseInt(fileImageMatch[1]) : 1
      
      return { 
        chapter, 
        image, 
        sortKey: `${chapter.toString().padStart(3, '0')}_${image.toString().padStart(4, '0')}` 
      }
    }
  }
  
  // Pattern 2: "Chapter X/Image Y" or "Chapter X\Image Y" (full path pattern)
  const chapterDirMatch = filename.match(/(?:chapter|ch|part)[\s_-]*(\d+)[\\/].*?(?:image|img)[\s_-]*(\d+)/i)
  if (chapterDirMatch) {
    const chapter = parseInt(chapterDirMatch[1])
    const image = parseInt(chapterDirMatch[2])
    return { 
      chapter, 
      image, 
      sortKey: `${chapter.toString().padStart(3, '0')}_${image.toString().padStart(4, '0')}` 
    }
  }
  
  // Pattern 3: "XX_YY" format in filename (chapter_image)
  const underscoreMatch = nameWithoutExt.match(/^(\d+)_(\d+)/)
  if (underscoreMatch) {
    const chapter = parseInt(underscoreMatch[1])
    const image = parseInt(underscoreMatch[2])
    return { 
      chapter, 
      image, 
      sortKey: `${chapter.toString().padStart(3, '0')}_${image.toString().padStart(4, '0')}` 
    }
  }
  
  // Pattern 4: "ChapterXImageY" format in filename
  const combinedMatch = nameWithoutExt.match(/(?:chapter|ch)(\d+)(?:image|img)(\d+)/i)
  if (combinedMatch) {
    const chapter = parseInt(combinedMatch[1])
    const image = parseInt(combinedMatch[2])
    return { 
      chapter, 
      image, 
      sortKey: `${chapter.toString().padStart(3, '0')}_${image.toString().padStart(4, '0')}` 
    }
  }
  
  // Pattern 5: "XXYY" format (first 2 digits chapter, last 2 digits image)
  const fourDigitMatch = nameWithoutExt.match(/^(\d{2})(\d{2})/)
  if (fourDigitMatch) {
    const chapter = parseInt(fourDigitMatch[1])
    const image = parseInt(fourDigitMatch[2])
    return { 
      chapter, 
      image, 
      sortKey: `${chapter.toString().padStart(3, '0')}_${image.toString().padStart(4, '0')}` 
    }
  }
  
  // Pattern 6: Just numbers at the start "123_anything" or "123.jpg" (single chapter)
  const numberMatch = nameWithoutExt.match(/^(\d+)/)
  if (numberMatch) {
    const number = parseInt(numberMatch[1])
    return { 
      chapter: 1, // Default to chapter 1
      image: number, 
      sortKey: `001_${number.toString().padStart(4, '0')}` 
    }
  }
  
  // Fallback: use alphabetical sorting with very high chapter number
  return { 
    chapter: 999, 
    image: 999, 
    sortKey: `999_${nameWithoutExt.toLowerCase()}` 
  }
}

// Helper function to resize image to 1280x720 maintaining aspect ratio
async function resizeImageTo16x9(imageBuffer: Buffer): Promise<Buffer> {
  const targetWidth = 1280
  const targetHeight = 720

  try {
    // First, validate that this is actually an image
    const metadata = await sharp(imageBuffer).metadata()
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not read image dimensions')
    }

    const originalAspectRatio = metadata.width / metadata.height
    const targetAspectRatio = targetWidth / targetHeight

    let resizeWidth: number
    let resizeHeight: number

    if (originalAspectRatio > targetAspectRatio) {
      // Image is wider than 16:9, fit by width
      resizeWidth = targetWidth
      resizeHeight = Math.round(targetWidth / originalAspectRatio)
    } else {
      // Image is taller than 16:9, fit by height
      resizeHeight = targetHeight
      resizeWidth = Math.round(targetHeight * originalAspectRatio)
    }

    // Resize the image maintaining aspect ratio
    const resizedImage = await sharp(imageBuffer)
      .resize(resizeWidth, resizeHeight, {
        fit: 'inside',
        withoutEnlargement: false
      })
      .jpeg({ quality: 90 })
      .toBuffer()

    return resizedImage
  } catch (error) {
    console.error('Error resizing image:', error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const zipFile = formData.get('zipFile') as File

    if (!zipFile) {
      return NextResponse.json({ error: 'No zip file provided' }, { status: 400 })
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (zipFile.size > maxSize) {
      return NextResponse.json({ 
        error: 'ZIP file is too large. Maximum size is 100MB.' 
      }, { status: 400 })
    }

    // Validate file extension
    const fileName = zipFile.name.toLowerCase()
    if (!fileName.endsWith('.zip')) {
      return NextResponse.json({ 
        error: 'Invalid file type. Please upload a .zip file.' 
      }, { status: 400 })
    }

    let zip: JSZip
    try {
      // Read the zip file
      const zipBuffer = Buffer.from(await zipFile.arrayBuffer())
      
      // Validate buffer is not empty
      if (zipBuffer.length === 0) {
        return NextResponse.json({ 
          error: 'ZIP file appears to be empty or corrupted.' 
        }, { status: 400 })
      }
      
      zip = await JSZip.loadAsync(zipBuffer)
    } catch (zipError) {
      console.error('ZIP loading error:', zipError)
      return NextResponse.json({ 
        error: 'Invalid ZIP file. The file may be corrupted, password-protected, or not a valid ZIP archive.' 
      }, { status: 400 })
    }

    // First, collect all valid image files with their sort information
    const imageFiles: Array<{
      filename: string
      file: JSZip.JSZipObject
      sortInfo: { chapter: number, image: number, sortKey: string }
    }> = []

    Object.keys(zip.files).forEach((filename) => {
      const file = zip.files[filename]
      
      // Skip directories, non-image files, and system files
      if (file.dir || !isImageFile(filename) || shouldSkipFile(filename)) {
        return
      }

      const sortInfo = extractChapterAndImageNumber(filename)
      imageFiles.push({
        filename,
        file,
        sortInfo
      })
    })

    // Check if any valid images were found
    if (imageFiles.length === 0) {
      return NextResponse.json({ 
        error: 'No valid image files found in the ZIP archive. Please ensure your ZIP contains images (jpg, png, gif, bmp, webp).' 
      }, { status: 400 })
    }

    // Sort files by chapter and image number
    imageFiles.sort((a, b) => a.sortInfo.sortKey.localeCompare(b.sortInfo.sortKey))

    const processedImages: Array<{
      id: string
      name: string
      originalName: string
      dataUrl: string
      processed: boolean
      chapter: number
      imageNumber: number
      sortOrder: number
    }> = []

    // Process each file in sorted order
    const promises = imageFiles.map(async ({ filename, file, sortInfo }, index) => {
      try {
        // Get file content as buffer
        const fileBuffer = await file.async('nodebuffer')
        
        // Validate buffer is not empty
        if (fileBuffer.length === 0) {
          console.warn(`Skipping empty file: ${filename}`)
          return null
        }
        
        // Resize image to fit 1280x720 while maintaining aspect ratio
        const resizedBuffer = await resizeImageTo16x9(fileBuffer)
        
        // Convert to base64 data URL
        const base64 = resizedBuffer.toString('base64')
        const dataUrl = `data:image/jpeg;base64,${base64}`
        
        // Generate unique ID
        const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        // Extract just the filename without path
        const name = filename.split('/').pop() || filename
        
        return {
          id,
          name: `${name.split('.')[0]}_processed.jpg`,
          originalName: name,
          dataUrl,
          processed: true,
          chapter: sortInfo.chapter,
          imageNumber: sortInfo.image,
          sortOrder: index + 1
        }
      } catch (error) {
        console.error(`Error processing image ${filename}:`, error)
        return null
      }
    })

    // Wait for all images to be processed
    const results = await Promise.all(promises)
    
    // Filter out null results
    results.forEach(result => {
      if (result) {
        processedImages.push(result)
      }
    })

    return NextResponse.json({
      success: true,
      images: processedImages,
      message: `Processed ${processedImages.length} images in chapter/image order`
    })

  } catch (error) {
    console.error('Error processing zip file:', error)
    return NextResponse.json(
      { error: 'Failed to process zip file: ' + (error as Error).message },
      { status: 500 }
    )
  }
} 