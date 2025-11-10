# Logo Update Guide

## Overview
The application has been updated to use theme-aware logos. The system now automatically switches between different logo variants based on the user's theme preference.

## Required Logo Files

You need to add the following logo files to the `/public` directory:

1. **`loopwell-logo-light.png`** - Black logo with white background (for light theme)
2. **`loopwell-logo-transparent.png`** - White logo with transparent background (for dark theme and AI buttons)

## Implementation Details

### Components Created

1. **`Logo` Component** (`src/components/logo.tsx`)
   - Automatically switches between light and dark logos based on theme
   - Used in headers, sidebars, and landing pages
   - Props: `width`, `height`, `className`, `priority`, `alt`

2. **`AILogo` Component** (`src/components/ai-logo.tsx`)
   - Uses transparent logo for AI buttons
   - Used in floating AI buttons and AI assistant buttons
   - Props: `width`, `height`, `className`, `priority`, `alt`

### Files Updated

All logo usages have been updated to use the new components:

- ✅ `src/components/layout/header.tsx` - Uses `Logo` component
- ✅ `src/components/layout/sidebar.tsx` - Uses `Logo` component
- ✅ `src/components/wiki/wiki-layout.tsx` - Uses `AILogo` for AI button
- ✅ `src/components/wiki/wiki-ai-assistant.tsx` - Uses `AILogo` for floating button
- ✅ `src/app/landing/page.tsx` - Uses `Logo` component (2 instances)

## How It Works

The `Logo` component uses the `useTheme()` hook to detect the current theme:
- **Light theme**: Shows `loopwell-logo-light.png` (black logo with white background)
- **Dark theme**: Shows `loopwell-logo-transparent.png` (white logo with transparent background)

The `AILogo` component always uses `loopwell-logo-transparent.png` regardless of theme, making it perfect for buttons with colored backgrounds.

## Next Steps

1. Add the two logo files to `/public` directory:
   - `/public/loopwell-logo-light.png`
   - `/public/loopwell-logo-transparent.png`

2. Test the implementation:
   - Switch between light and dark themes to verify logo changes
   - Check AI buttons to ensure transparent logo displays correctly
   - Verify logos appear correctly on landing page, headers, and sidebars

## Customization

If you need to change the logo file names, update the paths in:
- `src/components/logo.tsx` (lines 41-42)
- `src/components/ai-logo.tsx` (line 26)

