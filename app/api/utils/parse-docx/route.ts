import { NextRequest, NextResponse } from 'next/server'
import mammoth from 'mammoth'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('📄 Processing file:', file.name, 'Type:', file.type, 'Size:', file.size)

    // Check if it's a supported document file
    const isSupportedType = file.type.includes('officedocument') || 
                           file.type.includes('msword') || 
                           file.name.endsWith('.docx') || 
                           file.name.endsWith('.doc')
    
    if (!isSupportedType) {
      return NextResponse.json({ 
        error: 'File must be a .docx or .doc document. Supported formats: .docx, .doc' 
      }, { status: 400 })
    }
    
    try {
      console.log('🔧 Converting file to buffer...')
      // Convert file to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      console.log('📖 Parsing DOCX with mammoth...')
      
      // Parse DOCX using mammoth
      const result = await mammoth.extractRawText({ buffer: buffer as any })
      
      console.log('✅ DOCX parsed successfully')
      console.log('📊 Extracted text length:', result.value.length, 'characters')
      
      // Log any warnings from mammoth
      if (result.messages && result.messages.length > 0) {
        console.log('⚠️ Mammoth parsing messages:')
        result.messages.forEach(message => {
          console.log(`  ${message.type}: ${message.message}`)
        })
      }
      
      // Clean up the extracted text
      let cleanedText = result.value
        .replace(/\r\n/g, '\n')        // Normalize line endings
        .replace(/\n{3,}/g, '\n\n')    // Remove excessive line breaks
        .replace(/\t/g, ' ')           // Replace tabs with spaces
        .replace(/ {2,}/g, ' ')        // Replace multiple spaces with single space
        .trim()                        // Remove leading/trailing whitespace
      
      if (!cleanedText || cleanedText.length < 10) {
        return NextResponse.json({ 
          error: 'Document appears to be empty or contains no readable text. Please check your document and try again.' 
        }, { status: 400 })
      }
      
      console.log('🧹 Text cleaned, final length:', cleanedText.length, 'characters')
      console.log('📝 First 100 characters:', cleanedText.substring(0, 100))
      
      return NextResponse.json({ 
        content: cleanedText,
        success: true,
        metadata: {
          originalLength: result.value.length,
          cleanedLength: cleanedText.length,
          filename: file.name,
          warnings: result.messages?.length || 0
        }
      })
      
    } catch (parseError: any) {
      console.error('💥 Error parsing DOCX:', parseError)
      
      // Provide specific error messages based on error type
      let errorMessage = 'Failed to parse document'
      
      if (parseError.message?.includes('signature')) {
        errorMessage = 'Invalid document format. Please ensure the file is a valid .docx or .doc document.'
      } else if (parseError.message?.includes('ZIP')) {
        errorMessage = 'Document appears to be corrupted. Please try saving it again or use a different document.'
      } else if (parseError.message?.includes('buffer')) {
        errorMessage = 'Failed to read document file. Please try uploading again.'
      }
      
      return NextResponse.json({ 
        error: `${errorMessage} If the problem persists, try converting to .txt format or use the paste text option.`,
        details: parseError.message
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('💥 Unexpected error processing file upload:', error)
    return NextResponse.json(
      { 
        error: 'Unexpected error occurred while processing the file. Please try again or use the paste text option.',
        details: error.message 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'DOCX Parser API is working',
    method: 'GET',
    usage: 'Use POST method to upload and parse .docx or .doc files',
    supportedFormats: ['.docx', '.doc'],
    maxFileSize: '10MB (recommended)',
    example: {
      endpoint: '/api/utils/parse-docx',
      method: 'POST',
      contentType: 'multipart/form-data',
      formField: 'file'
    }
  })
}
