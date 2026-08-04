#!/bin/bash
# Migrate all API routes to use new authentication system

echo "🔄 Migrating API routes to new auth system..."

# List of files that need migration (still using getUserFromSession with safawala_session)
files=(
  "app/api/staff/route.ts"
  "app/api/staff/[id]/route.ts"
  "app/api/staff/update/route.ts"
  "app/api/staff/[id]/toggle-status/route.ts"
  "app/api/services/route.ts"
  "app/api/reports/export/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ Found: $file"
  else
    echo "⚠️  Missing: $file"
  fi
done

echo ""
echo "⚡ Ready to migrate ${#files[@]} files"
echo "📝 Changes will:"
echo "   1. Replace getUserFromSession with authenticateRequest"
echo "   2. Add proper role and permission checks"
echo "   3. Ensure franchise isolation"
echo ""
echo "Run manual updates or use find/replace with the new auth pattern."
