#!/bin/bash
# Workspace Scoping Audit Script
# Finds Prisma write operations and checks for workspaceId

echo "=============================================="
echo "Workspace Scoping Audit - $(date +%Y-%m-%d)"
echo "=============================================="
echo ""

# Define workspace-scoped models (camelCase as used in Prisma)
MODELS="project|task|wikiPage|activity|chatSession|epic|milestone|integration|workflow|onboardingPlan|onboardingTask|onboardingTemplate|contextItem|todo|projectMember|taskComment|subtask"

# Find all create operations
echo "=== CREATE OPERATIONS ==="
grep -rn "prisma\.\($MODELS\)\.create(" src/app/api --include="*.ts" | while read line; do
    file=$(echo "$line" | cut -d: -f1)
    lineno=$(echo "$line" | cut -d: -f2)
    
    # Check if workspaceId is present in next 15 lines
    has_workspace=$(sed -n "${lineno},$((lineno+15))p" "$file" | grep -c "workspaceId")
    
    if [ "$has_workspace" -eq 0 ]; then
        echo "❌ CRITICAL: $file:$lineno - Missing workspaceId"
    else
        echo "✅ OK: $file:$lineno"
    fi
done

echo ""
echo "=== UPDATE OPERATIONS ==="
grep -rn "prisma\.\($MODELS\)\.update(" src/app/api --include="*.ts" | while read line; do
    file=$(echo "$line" | cut -d: -f1)
    lineno=$(echo "$line" | cut -d: -f2)
    
    # Updates often use ID which implies ownership, but check for explicit workspaceId
    has_workspace=$(sed -n "${lineno},$((lineno+15))p" "$file" | grep -c "workspaceId")
    has_where_id=$(sed -n "${lineno},$((lineno+10))p" "$file" | grep -c "where:.*id:")
    
    if [ "$has_workspace" -gt 0 ]; then
        echo "✅ OK: $file:$lineno (has workspaceId)"
    elif [ "$has_where_id" -gt 0 ]; then
        echo "⚠️ HIGH: $file:$lineno (ID-based, no workspaceId filter)"
    else
        echo "❌ CRITICAL: $file:$lineno - No ownership check"
    fi
done

echo ""
echo "=== DELETE OPERATIONS ==="
grep -rn "prisma\.\($MODELS\)\.delete(" src/app/api --include="*.ts" | while read line; do
    file=$(echo "$line" | cut -d: -f1)
    lineno=$(echo "$line" | cut -d: -f2)
    
    has_workspace=$(sed -n "${lineno},$((lineno+10))p" "$file" | grep -c "workspaceId")
    has_where_id=$(sed -n "${lineno},$((lineno+10))p" "$file" | grep -c "where:.*id:")
    
    if [ "$has_workspace" -gt 0 ]; then
        echo "✅ OK: $file:$lineno (has workspaceId)"
    elif [ "$has_where_id" -gt 0 ]; then
        echo "⚠️ HIGH: $file:$lineno (ID-based, no workspaceId filter)"
    else
        echo "❌ CRITICAL: $file:$lineno - No ownership check"
    fi
done

echo ""
echo "=== SUMMARY ==="
echo "CRITICAL = Write/Update/Delete without workspaceId or ID check"
echo "HIGH = Uses ID but no explicit workspaceId filter"
echo "OK = Has workspaceId in query"
