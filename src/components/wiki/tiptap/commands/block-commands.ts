/**
 * Block Commands
 * 
 * TipTap commands for block-level operations:
 * - Turn into (transform block type)
 * - Duplicate block
 * - Delete block
 */

import { Editor } from '@tiptap/core'
import { getActiveBlock } from '../ui/block-targeting'

/**
 * Turn current block into a different block type
 */
export function turnIntoBlock(editor: Editor, targetType: string): boolean {
  if (!editor) return false

  const blockInfo = getActiveBlock(editor)
  if (!blockInfo) return false

  try {
    // For lists, we need special handling
    if (blockInfo.type === 'bulletList' || blockInfo.type === 'orderedList' || blockInfo.type === 'taskList') {
      // If we're in a list and want to convert to non-list, exit list first
      if (targetType === 'paragraph' || targetType.startsWith('heading-') || targetType === 'blockquote' || targetType === 'codeBlock') {
        // Exit list and convert first list item
        editor.chain().focus().liftListItem('listItem').run()
        // Then convert the resulting block
        const newBlockInfo = getActiveBlock(editor)
        if (newBlockInfo) {
          editor.chain().focus().setTextSelection({ from: newBlockInfo.from, to: newBlockInfo.to }).run()
        }
      }
    }

    // Transform based on target type
    switch (targetType) {
      case 'paragraph':
        if (editor.isActive('heading')) {
          editor.chain().focus().setParagraph().run()
        } else if (editor.isActive('blockquote')) {
          editor.chain().focus().toggleBlockquote().run()
        } else if (editor.isActive('codeBlock')) {
          // Extract text from code block
          const text = editor.state.doc.textBetween(blockInfo.from, blockInfo.to)
          editor.chain().focus().setTextSelection({ from: blockInfo.from, to: blockInfo.to }).deleteSelection().insertContent({ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }).run()
        } else {
          editor.chain().focus().setParagraph().run()
        }
        break
      case 'heading-1':
        editor.chain().focus().setHeading({ level: 1 }).run()
        break
      case 'heading-2':
        editor.chain().focus().setHeading({ level: 2 }).run()
        break
      case 'heading-3':
        editor.chain().focus().setHeading({ level: 3 }).run()
        break
      case 'blockquote':
        if (!editor.isActive('blockquote')) {
          editor.chain().focus().toggleBlockquote().run()
        }
        break
      case 'bulletList':
        if (!editor.isActive('bulletList')) {
          editor.chain().focus().toggleBulletList().run()
        }
        break
      case 'orderedList':
        if (!editor.isActive('orderedList')) {
          editor.chain().focus().toggleOrderedList().run()
        }
        break
      case 'taskList':
        if (!editor.isActive('taskList')) {
          // Convert current block to task list
          const text = editor.state.doc.textBetween(blockInfo.from, blockInfo.to)
          editor
            .chain()
            .focus()
            .setTextSelection({ from: blockInfo.from, to: blockInfo.to })
            .deleteSelection()
            .insertContent({
              type: 'taskList',
              content: [
                {
                  type: 'taskItem',
                  attrs: { checked: false },
                  content: [
                    {
                      type: 'paragraph',
                      content: text ? [{ type: 'text', text }] : [],
                    },
                  ],
                },
              ],
            })
            .run()
        }
        break
      case 'codeBlock':
        editor.chain().focus().setCodeBlock().run()
        break
      default:
        return false
    }

    return true
  } catch (error) {
    console.error('Error turning into block:', error)
    return false
  }
}

/**
 * Duplicate the current block
 */
export function duplicateBlock(editor: Editor): boolean {
  if (!editor) return false

  const blockInfo = getActiveBlock(editor)
  if (!blockInfo) return false

  try {
    // Get the block content as JSON
    
    // Find the block in the JSON structure (simplified - we'll use slice approach)
    const { state } = editor
    const slice = state.doc.slice(blockInfo.from, blockInfo.to)
    
    // Insert duplicated content after the current block
    editor
      .chain()
      .focus()
      .setTextSelection(blockInfo.to)
      .insertContent(slice.content.toJSON())
      .setTextSelection(blockInfo.to + slice.size)
      .run()

    return true
  } catch (error) {
    console.error('Error duplicating block:', error)
    return false
  }
}

/**
 * Delete the current block
 */
export function deleteBlock(editor: Editor): boolean {
  if (!editor) return false

  const blockInfo = getActiveBlock(editor)
  if (!blockInfo) return false

  try {
    // Delete the block
    editor
      .chain()
      .focus()
      .setTextSelection({ from: blockInfo.from, to: blockInfo.to })
      .deleteSelection()
      .run()

    // Move cursor to next block or create paragraph if document is empty
    const { state } = editor
    if (state.doc.content.size === 0) {
      editor.chain().focus().insertContent({ type: 'paragraph' }).run()
    } else {
      // Place cursor at the position where block was deleted
      const nextPos = Math.min(blockInfo.from, state.doc.content.size - 1)
      editor.chain().focus().setTextSelection(nextPos).run()
    }

    return true
  } catch (error) {
    console.error('Error deleting block:', error)
    return false
  }
}
