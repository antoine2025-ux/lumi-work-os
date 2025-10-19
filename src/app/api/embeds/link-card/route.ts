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

    // For link cards, we'll try to fetch basic metadata from the URL
    // In a real implementation, you'd fetch the page and extract meta tags
    const urlObj = new URL(url)
    const hostname = urlObj.hostname

    const embedData = {
      title: hostname,
      description: `Link to ${hostname}`,
      thumbnail: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`,
      metadata: {
        type: 'link_card',
        url,
        hostname
      }
    }

    return NextResponse.json(embedData)
  } catch (error) {
    console.error('Link card embed error:', error)
    return NextResponse.json({ error: 'Failed to process link card embed' }, { status: 500 })
  }
}
