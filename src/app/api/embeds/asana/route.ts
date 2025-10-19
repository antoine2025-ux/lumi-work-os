import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Extract project/task ID from Asana URL
    const asanaMatch = url.match(/app\.asana\.com\/([^\/]+)/)
    if (!asanaMatch) {
      return NextResponse.json({ error: 'Invalid Asana URL' }, { status: 400 })
    }

    const [, path] = asanaMatch

    // For now, we'll return basic metadata
    // In a real implementation, you'd call Asana's API to get project/task details
    const embedData = {
      title: 'Asana Project',
      description: 'Asana project or task',
      metadata: {
        path,
        type: 'asana_project'
      }
    }

    return NextResponse.json(embedData)
  } catch (error) {
    console.error('Asana embed error:', error)
    return NextResponse.json({ error: 'Failed to process Asana embed' }, { status: 500 })
  }
}
