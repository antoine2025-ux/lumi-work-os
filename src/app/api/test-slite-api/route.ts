import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { apiKey } = body

    console.log('=== SLITE API TEST START ===')
    console.log('API Key (first 10 chars):', apiKey?.substring(0, 10) + '...')

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    // Test /me endpoint
    console.log('Testing /me endpoint...')
    const meResponse = await fetch('https://api.slite.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    })
    
    console.log('Me response status:', meResponse.status)
    const meData = await meResponse.json()
    console.log('Me data:', meData)

    if (!meResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `Authentication failed: ${meResponse.status} ${meResponse.statusText}`,
        details: meData
      })
    }

    // Test search-notes endpoint with different queries
    console.log('Testing search-notes with query=*')
    const searchResponse1 = await fetch('https://api.slite.com/v1/search-notes?query=*', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    })
    
    console.log('Search with * response status:', searchResponse1.status)
    const searchData1 = await searchResponse1.json()
    console.log('Search with * data:', JSON.stringify(searchData1, null, 2))
    
    // Try without query parameter
    console.log('Testing search-notes without query parameter')
    const searchResponse2 = await fetch('https://api.slite.com/v1/search-notes', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    })
    
    console.log('Search without query response status:', searchResponse2.status)
    const searchData2 = await searchResponse2.json()
    console.log('Search without query data:', JSON.stringify(searchData2, null, 2))
    
    // Try with empty query
    console.log('Testing search-notes with empty query')
    const searchResponse3 = await fetch('https://api.slite.com/v1/search-notes?query=', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      }
    })
    
    console.log('Search with empty query response status:', searchResponse3.status)
    const searchData3 = await searchResponse3.json()
    console.log('Search with empty query data:', JSON.stringify(searchData3, null, 2))
    
    // Determine which response to use - Slite API returns 'hits' not 'notes'
    // Use the response with the most hits
    let finalSearchData = searchData1
    let finalNotesCount = 0
    
    const counts = [
      { data: searchData1, count: searchData1.hits?.length || 0, name: 'searchData1' },
      { data: searchData2, count: searchData2.hits?.length || 0, name: 'searchData2' },
      { data: searchData3, count: searchData3.hits?.length || 0, name: 'searchData3' }
    ]
    
    // Find the response with the most hits
    const bestResponse = counts.reduce((best, current) => 
      current.count > best.count ? current : best
    )
    
    finalSearchData = bestResponse.data
    finalNotesCount = bestResponse.count
    
    console.log('Using', bestResponse.name, '- found', finalNotesCount, 'notes in hits array')
    
    if (finalNotesCount === 0) {
      console.log('No notes found in any response')
      console.log('searchData1 hits count:', searchData1.hits?.length || 0)
      console.log('searchData2 hits count:', searchData2.hits?.length || 0)
      console.log('searchData3 hits count:', searchData3.hits?.length || 0)
    }

    console.log('=== SLITE API TEST END ===')

    return NextResponse.json({
      success: true,
      message: 'Slite API connection successful',
      meData: meData,
      searchData: finalSearchData,
      notesCount: finalNotesCount
    })

  } catch (error) {
    console.error('=== SLITE API TEST ERROR ===')
    console.error('Error:', error)
    console.error('=== SLITE API TEST ERROR END ===')
    
    return NextResponse.json({ 
      success: false,
      error: 'Slite API test failed', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}