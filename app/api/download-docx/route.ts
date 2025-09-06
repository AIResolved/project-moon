import { NextRequest, NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    console.log('📄 Generating DOCX document for:', title || 'Untitled Script')

    // Convert markdown content to structured paragraphs
    const paragraphs = parseContentToParagraphs(content)

    // Create a new document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Title paragraph
            new Paragraph({
              text: title || 'Script',
              heading: HeadingLevel.TITLE,
              spacing: { after: 400 }
            }),
            // Content paragraphs
            ...paragraphs
          ]
        }
      ]
    })

    // Generate the DOCX buffer
    const buffer = await Packer.toBuffer(doc)

    // Create filename
    const filename = `${(title || 'Script').replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}.docx`

    // Return the file as a response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString()
      }
    })

  } catch (error) {
    console.error('❌ Error generating DOCX:', error)
    return NextResponse.json(
      { error: 'Failed to generate DOCX document', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function parseContentToParagraphs(content: string): Paragraph[] {
  const paragraphs: Paragraph[] = []
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) {
      // Empty line - add spacing
      paragraphs.push(new Paragraph({
        text: '',
        spacing: { after: 200 }
      }))
      continue
    }
    
    // Handle markdown headers
    if (trimmedLine.startsWith('# ')) {
      paragraphs.push(new Paragraph({
        text: trimmedLine.replace(/^# /, ''),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }))
    } else if (trimmedLine.startsWith('## ')) {
      paragraphs.push(new Paragraph({
        text: trimmedLine.replace(/^## /, ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 }
      }))
    } else if (trimmedLine.startsWith('### ')) {
      paragraphs.push(new Paragraph({
        text: trimmedLine.replace(/^### /, ''),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 }
      }))
    } else {
      // Regular paragraph with markdown formatting
      const textRuns = parseMarkdownToTextRuns(trimmedLine)
      paragraphs.push(new Paragraph({
        children: textRuns,
        spacing: { after: 120 }
      }))
    }
  }
  
  return paragraphs
}

function parseMarkdownToTextRuns(text: string): TextRun[] {
  const textRuns: TextRun[] = []
  let currentIndex = 0
  
  // Simple markdown parser for bold, italic, and regular text
  const markdownRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g
  let match
  
  while ((match = markdownRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      const beforeText = text.slice(currentIndex, match.index)
      if (beforeText) {
        textRuns.push(new TextRun(beforeText))
      }
    }
    
    // Add formatted text
    if (match[2]) {
      // Bold text (**text**)
      textRuns.push(new TextRun({
        text: match[2],
        bold: true
      }))
    } else if (match[3]) {
      // Italic text (*text*)
      textRuns.push(new TextRun({
        text: match[3],
        italics: true
      }))
    } else if (match[4]) {
      // Code text (`text`)
      textRuns.push(new TextRun({
        text: match[4],
        font: { name: 'Courier New' }
      }))
    }
    
    currentIndex = match.index + match[0].length
  }
  
  // Add remaining text after last match
  if (currentIndex < text.length) {
    const remainingText = text.slice(currentIndex)
    if (remainingText) {
      textRuns.push(new TextRun(remainingText))
    }
  }
  
  // If no matches found, return the original text as a single TextRun
  if (textRuns.length === 0) {
    textRuns.push(new TextRun(text))
  }
  
  return textRuns
}

export async function GET() {
  return NextResponse.json({
    message: 'DOCX Generator API',
    method: 'GET',
    usage: 'Use POST method to generate DOCX files from script content',
    example: {
      endpoint: '/api/download-docx',
      method: 'POST',
      contentType: 'application/json',
      body: {
        title: 'Script Title',
        content: 'Script content with markdown formatting'
      }
    }
  })
}
