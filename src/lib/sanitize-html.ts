/**
 * HTML sanitization for safe rendering of user/external content (e.g. email bodies).
 * Uses isomorphic-dompurify for server and client compatibility.
 */

import DOMPurify from 'isomorphic-dompurify'

const EMAIL_ALLOWED_TAGS = [
  'p',
  'br',
  'b',
  'i',
  'u',
  'strong',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'blockquote',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'div',
  'span',
  'pre',
  'code',
  'hr',
] as const

const EMAIL_ALLOWED_ATTR = [
  'href',
  'src',
  'alt',
  'class',
  'style',
  'target',
  'rel',
  'width',
  'height',
  'colspan',
  'rowspan',
  'border',
  'align',
  'valign',
]

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...EMAIL_ALLOWED_TAGS],
    ALLOWED_ATTR: EMAIL_ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
  })
}
