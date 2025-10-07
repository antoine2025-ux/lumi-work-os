import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // For generic embeds, we'll try to fetch basic metadata
    // In a real implementation, you might use a service like oEmbed or fetch meta tags
    const embedData = {
      title: 'External Link',
      description: 'External content',
      metadata: {
        type: 'generic',
        url
      }
    }

    return NextResponse.json(embedData)
  } catch (error) {
    console.error('Generic embed error:', error)
    return NextResponse.json({ error: 'Failed to process generic embed' }, { status: 500 })
  }
}
