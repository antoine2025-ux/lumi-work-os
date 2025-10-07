import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Extract file ID from Figma URL
    const fileIdMatch = url.match(/figma\.com\/file\/([a-zA-Z0-9]+)/)
    if (!fileIdMatch) {
      return NextResponse.json({ error: 'Invalid Figma URL' }, { status: 400 })
    }

    const fileId = fileIdMatch[1]
    
    // For now, we'll return basic metadata
    // In a real implementation, you'd call Figma's API to get file details
    const embedData = {
      title: 'Figma Design',
      description: 'Interactive Figma design',
      thumbnail: `https://www.figma.com/api/figma/file/${fileId}/images`,
      metadata: {
        fileId,
        type: 'figma_file'
      }
    }

    return NextResponse.json(embedData)
  } catch (error) {
    console.error('Figma embed error:', error)
    return NextResponse.json({ error: 'Failed to process Figma embed' }, { status: 500 })
  }
}
