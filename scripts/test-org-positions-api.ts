/**
 * Manual Test Script for /api/org/positions API
 * 
 * Run this in development to verify the optimized endpoint works correctly.
 * 
 * Usage:
 *   1. Start dev server: npm run dev
 *   2. Get a valid session cookie from browser DevTools
 *   3. Run: npx tsx scripts/test-org-positions-api.ts <session-cookie>
 * 
 * Or use curl commands below for manual testing.
 */

// Safety: Require explicit BASE_URL or default to localhost
// Prevent accidental production usage
const BASE_URL = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Safety guard: Fail loudly if pointing to production
function checkProductionGuard() {
  try {
    const url = new URL(BASE_URL)
    const hostname = url.hostname.toLowerCase()
    
    // Check for production domains
    const isProduction = hostname.includes('loopwell.io') || 
                        hostname.includes('lumi.app') ||
                        (hostname !== 'localhost' && !hostname.includes('127.0.0.1') && !hostname.includes('staging'))
    
    if (isProduction && process.env.ALLOW_PROD !== 'true') {
      console.error('❌ SAFETY CHECK FAILED: BASE_URL points to production!')
      console.error(`   BASE_URL: ${BASE_URL}`)
      console.error(`   Hostname: ${hostname}`)
      console.error('')
      console.error('To allow production testing (NOT RECOMMENDED), set:')
      console.error('   ALLOW_PROD=true npx tsx scripts/test-org-positions-api.ts <cookie>')
      console.error('')
      console.error('This script is GET-only (read-only), but production testing should be explicit.')
      process.exit(1)
    }
    
    if (isProduction) {
      console.warn('⚠️  WARNING: Testing against production!')
      console.warn(`   BASE_URL: ${BASE_URL}`)
    }
  } catch (error) {
    console.error('❌ Invalid BASE_URL:', BASE_URL)
    process.exit(1)
  }
}

async function testOrgPositions(sessionCookie: string) {
  // Safety: Only GET requests (read-only, non-destructive)
  // This script only uses fetch() with GET method - no POST/PUT/DELETE
  const headers = {
    'Cookie': sessionCookie,
    'Content-Type': 'application/json'
  }

  console.log('🧪 Testing /api/org/positions endpoint\n')

  // Test 1: Default flat mode
  console.log('Test 1: Default flat mode (should return flat list with childCount)')
  try {
    const flatResponse = await fetch(`${BASE_URL}/api/org/positions`, { headers })
    const flatData = await flatResponse.json()
    
    if (!Array.isArray(flatData)) {
      throw new Error('Response is not an array')
    }
    
    // Check: No children arrays in default mode (must be undefined/omitted, not even empty array)
    const hasChildren = flatData.some((pos: any) => 'children' in pos)
    if (hasChildren) {
      const positionsWithChildren = flatData.filter((pos: any) => 'children' in pos)
      throw new Error(`❌ FAIL: Default mode should not include 'children' field at all. Found in ${positionsWithChildren.length} positions.`)
    }
    
    // Also check for empty arrays (JSON bloat)
    const hasEmptyChildren = flatData.some((pos: any) => Array.isArray(pos.children) && pos.children.length === 0)
    if (hasEmptyChildren) {
      throw new Error('❌ FAIL: Default mode should not include empty children arrays (JSON bloat)')
    }
    
    // Check: childCount field exists
    const hasChildCount = flatData.every((pos: any) => typeof pos.childCount === 'number')
    if (!hasChildCount && flatData.length > 0) {
      throw new Error('❌ FAIL: Default mode should include childCount field')
    }
    
    // Check: Required fields present
    const requiredFields = ['id', 'title', 'level', 'parentId', 'isActive']
    const missingFields = requiredFields.filter(field => 
      flatData.length > 0 && !(field in flatData[0])
    )
    if (missingFields.length > 0) {
      throw new Error(`❌ FAIL: Missing required fields: ${missingFields.join(', ')}`)
    }
    
    console.log(`✅ PASS: Flat mode returns ${flatData.length} positions`)
    console.log(`   - No children arrays: ✅`)
    console.log(`   - childCount field: ✅`)
    console.log(`   - Required fields: ✅`)
    console.log(`   - Sample position:`, {
      id: flatData[0]?.id,
      title: flatData[0]?.title,
      childCount: flatData[0]?.childCount
    })
  } catch (error) {
    console.error('❌ FAIL:', error instanceof Error ? error.message : error)
    return false
  }

  console.log('\n')

  // Test 2: Lazy-load children mode
  if (flatData && flatData.length > 0) {
    const parentWithChildren = flatData.find((pos: any) => pos.childCount > 0)
    if (parentWithChildren) {
      console.log(`Test 2: Lazy-load children (parentId=${parentWithChildren.id})`)
      try {
        const childrenResponse = await fetch(
          `${BASE_URL}/api/org/positions?includeChildren=true&parentId=${parentWithChildren.id}`,
          { headers }
        )
        const childrenData = await childrenResponse.json()
        
        if (!Array.isArray(childrenData)) {
          throw new Error('Response is not an array')
        }
        
        // Check: All returned positions have the correct parentId
        const wrongParent = childrenData.find((pos: any) => pos.parentId !== parentWithChildren.id)
        if (wrongParent) {
          throw new Error(`❌ FAIL: Found position with wrong parentId: ${wrongParent.id}`)
        }
        
        // Check: Count matches expected
        if (childrenData.length !== parentWithChildren.childCount) {
          console.log(`⚠️  WARN: childCount=${parentWithChildren.childCount} but children returned=${childrenData.length}`)
        }
        
        console.log(`✅ PASS: Children mode returns ${childrenData.length} children`)
        console.log(`   - All have correct parentId: ✅`)
        console.log(`   - Sample child:`, {
          id: childrenData[0]?.id,
          title: childrenData[0]?.title,
          parentId: childrenData[0]?.parentId
        })
      } catch (error) {
        console.error('❌ FAIL:', error instanceof Error ? error.message : error)
        return false
      }
    } else {
      console.log('Test 2: Skipped (no positions with children found)')
    }
  }

  console.log('\n')

  // Test 3: Legacy tree mode
  console.log('Test 3: Legacy tree mode (tree=1, should return nested children)')
  try {
    const treeResponse = await fetch(`${BASE_URL}/api/org/positions?tree=1`, { headers })
    const treeData = await treeResponse.json()
    
    if (!Array.isArray(treeData)) {
      throw new Error('Response is not an array')
    }
    
    // Check: Tree mode includes children arrays
    const hasChildren = treeData.some((pos: any) => Array.isArray(pos.children))
    if (!hasChildren && treeData.length > 0) {
      // This is OK if no positions have children, but log it
      console.log('⚠️  WARN: Tree mode returned no children arrays (may be empty org)')
    } else if (hasChildren) {
      console.log(`✅ PASS: Tree mode includes nested children arrays`)
    }
    
    // Check: Tree mode has all legacy fields
    const legacyFields = ['roleDescription', 'responsibilities', 'parent']
    const hasLegacyFields = treeData.length > 0 && legacyFields.every(field => field in treeData[0])
    if (hasLegacyFields) {
      console.log(`✅ PASS: Tree mode includes legacy fields`)
    }
    
    console.log(`✅ PASS: Tree mode returns ${treeData.length} positions`)
  } catch (error) {
    console.error('❌ FAIL:', error instanceof Error ? error.message : error)
    return false
  }

  console.log('\n✅ All tests passed!')
  return true
}

// Manual test instructions
console.log(`
📋 Manual Test Instructions (Alternative to Script)

If you prefer curl commands, use these:

1. Default flat mode:
   curl -H "Cookie: <your-session-cookie>" http://localhost:3000/api/org/positions | jq '.[0] | {id, title, childCount, hasChildren: (.children != null)}'

2. Lazy-load children:
   curl -H "Cookie: <your-session-cookie>" "http://localhost:3000/api/org/positions?includeChildren=true&parentId=<position-id>" | jq 'length'

3. Legacy tree mode:
   curl -H "Cookie: <your-session-cookie>" "http://localhost:3000/api/org/positions?tree=1" | jq '.[0].children | length'

Expected Results:
- Default: No children arrays, has childCount field
- Children: Only positions with specified parentId
- Tree: Nested children arrays present
`)

// Run if called directly
if (require.main === module) {
  // Safety check: Prevent accidental production usage
  checkProductionGuard()
  
  const sessionCookie = process.argv[2]
  if (!sessionCookie) {
    console.error('Usage: npx tsx scripts/test-org-positions-api.ts <session-cookie>')
    console.error('Get session cookie from browser DevTools → Application → Cookies')
    console.error('')
    console.error('Environment variables:')
    console.error('  BASE_URL - API base URL (default: http://localhost:3000)')
    console.error('  ALLOW_PROD - Set to "true" to allow production (NOT RECOMMENDED)')
    process.exit(1)
  }
  
  testOrgPositions(sessionCookie)
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Error:', error)
      process.exit(1)
    })
}

export { testOrgPositions }
