/**
 * Utility functions for processing wiki page content
 * Handles grouping consecutive code blocks for better rendering and context
 */

/**
 * Groups consecutive code blocks in HTML content
 * Merges multiple sequential <pre> or <code> blocks into a single block
 * 
 * @param htmlContent - The HTML content to process
 * @returns Processed HTML with consecutive code blocks merged
 */
export function groupConsecutiveCodeBlocks(htmlContent: string): string {
  if (!htmlContent) return htmlContent

  // Pattern to match code blocks: <pre>...</pre> or <code>...</code> blocks
  // We'll use a regex to find all code blocks and their positions
  const codeBlockPattern = /<(pre|code)[^>]*>[\s\S]*?<\/\1>/gi
  
  // Find all code blocks with their positions
  const blocks: Array<{ match: string; start: number; end: number; type: string }> = []
  let match
  
  while ((match = codeBlockPattern.exec(htmlContent)) !== null) {
    blocks.push({
      match: match[0],
      start: match.index,
      end: match.index + match[0].length,
      type: match[1] // 'pre' or 'code'
    })
  }

  if (blocks.length === 0) return htmlContent

  // Group consecutive blocks
  const groups: Array<Array<typeof blocks[0]>> = []
  let currentGroup: Array<typeof blocks[0]> = [blocks[0]]

  for (let i = 1; i < blocks.length; i++) {
    const prevBlock = blocks[i - 1]
    const currentBlock = blocks[i]
    
    // Check if blocks are consecutive (allowing for whitespace/newlines between them)
    const gap = htmlContent.substring(prevBlock.end, currentBlock.start)
    const isConsecutive = /^[\s\n\r]*$/.test(gap) // Only whitespace/newlines between blocks
    
    if (isConsecutive) {
      currentGroup.push(currentBlock)
    } else {
      groups.push(currentGroup)
      currentGroup = [currentBlock]
    }
  }
  groups.push(currentGroup)

  // Build the result by replacing grouped blocks
  // Process groups in reverse order to maintain indices
  const replacements: Array<{ start: number; end: number; replacement: string }> = []
  
  for (const group of groups) {
    if (group.length <= 1) continue // Skip single blocks

    // Extract content from all blocks in the group
    const contents: string[] = []
    for (const block of group) {
      // Extract inner content (remove tags)
      const innerMatch = block.match.match(/<(?:pre|code)[^>]*>([\s\S]*?)<\/(?:pre|code)>/i)
      if (innerMatch) {
        contents.push(innerMatch[1])
      }
    }

    // Merge contents with double newline separator
    const mergedContent = contents.join('\n\n')
    
    // Use the first block's tag structure for the merged block
    const firstBlock = group[0]
    const tagMatch = firstBlock.match.match(/<((?:pre|code))([^>]*)>/i)
    const tagName = tagMatch ? tagMatch[1] : 'pre'
    const attributes = tagMatch ? tagMatch[2] : ''
    
    const mergedBlock = `<${tagName}${attributes}>${mergedContent}</${tagName}>`
    
    // Store replacement info
    const groupStart = group[0].start
    const groupEnd = group[group.length - 1].end
    
    replacements.push({
      start: groupStart,
      end: groupEnd,
      replacement: mergedBlock
    })
  }

  // Apply replacements in reverse order
  if (replacements.length === 0) return htmlContent
  
  let result = htmlContent
  for (let i = replacements.length - 1; i >= 0; i--) {
    const rep = replacements[i]
    result = result.substring(0, rep.start) + rep.replacement + result.substring(rep.end)
  }

  return result
}

/**
 * Groups consecutive code blocks in markdown content
 * Merges multiple sequential code fence blocks (```...```) into a single block
 * 
 * @param markdownContent - The markdown content to process
 * @returns Processed markdown with consecutive code blocks merged
 */
export function groupConsecutiveCodeBlocksMarkdown(markdownContent: string): string {
  if (!markdownContent) return markdownContent

  // Pattern to match markdown code fences: ```language\ncontent\n```
  const codeFencePattern = /```(\w+)?\n([\s\S]*?)```/g
  
  const blocks: Array<{ match: string; start: number; end: number; language: string; content: string }> = []
  let match
  
  while ((match = codeFencePattern.exec(markdownContent)) !== null) {
    blocks.push({
      match: match[0],
      start: match.index,
      end: match.index + match[0].length,
      language: match[1] || '',
      content: match[2]
    })
  }

  if (blocks.length === 0) return markdownContent

  // Group consecutive blocks
  const groups: Array<Array<typeof blocks[0]>> = []
  let currentGroup: Array<typeof blocks[0]> = [blocks[0]]

  for (let i = 1; i < blocks.length; i++) {
    const prevBlock = blocks[i - 1]
    const currentBlock = blocks[i]
    
    // Check if blocks are consecutive (allowing for whitespace/newlines between them)
    const gap = markdownContent.substring(prevBlock.end, currentBlock.start)
    const isConsecutive = /^[\s\n\r]*$/.test(gap)
    
    if (isConsecutive) {
      currentGroup.push(currentBlock)
    } else {
      groups.push(currentGroup)
      currentGroup = [currentBlock]
    }
  }
  groups.push(currentGroup)

  // Build the result
  let result = markdownContent
  let offset = 0

  // Process groups in reverse order
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i]
    if (group.length <= 1) continue

    // Merge contents
    const contents = group.map(b => b.content)
    const mergedContent = contents.join('\n\n')
    
    // Use the first block's language
    const language = group[0].language ? group[0].language + '\n' : ''
    const mergedBlock = `\`\`\`${language}${mergedContent}\`\`\``
    
    // Replace the group
    const groupStart = group[0].start
    const groupEnd = group[group.length - 1].end
    const beforeGroup = result.substring(0, groupStart + offset)
    const afterGroup = result.substring(groupEnd + offset)
    
    const originalGap = markdownContent.substring(group[0].end, group[group.length - 1].start)
    
    result = beforeGroup + mergedBlock + originalGap + afterGroup
    offset += mergedBlock.length - (groupEnd - groupStart)
  }

  return result
}

