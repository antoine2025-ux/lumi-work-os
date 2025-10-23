#!/bin/bash

# Fix Next.js 15 route parameter issues
files=(
  "src/app/api/org/positions/[id]/route.ts"
  "src/app/api/workspaces/[workspaceId]/user-role/route.ts"
  "src/app/api/onboarding/tasks/[id]/route.ts"
  "src/app/api/onboarding/templates/[id]/route.ts"
)

for file in "${files[@]}"; do
  echo "Fixing $file..."
  
  # Replace { params: { id: string } } with { params: Promise<{ id: string }> }
  sed -i '' 's/{ params: { id: string } }/{ params: Promise<{ id: string }> }/g' "$file"
  
  # Replace { params: { workspaceId: string } } with { params: Promise<{ workspaceId: string }> }
  sed -i '' 's/{ params: { workspaceId: string } }/{ params: Promise<{ workspaceId: string }> }/g' "$file"
  
  # Add resolvedParams = await params and update usage
  sed -i '' 's/params\.id/resolvedParams.id/g' "$file"
  sed -i '' 's/params\.workspaceId/resolvedParams.workspaceId/g' "$file"
  
  # Add resolvedParams declaration after try {
  sed -i '' 's/try {/try {\n    const resolvedParams = await params/g' "$file"
done

echo "All route files fixed!"
