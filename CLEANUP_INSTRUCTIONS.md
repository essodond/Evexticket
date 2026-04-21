# Cleanup Instructions - Dead Files

The following files should be deleted as they are incomplete, duplicate, or broken:

## Backend Fix Scripts (5 files)
```
backend/fix_views.py           - Duplicate view fixes (logic already in views.py)
backend/fix_endpoints.py       - Duplicate endpoint fixes (already applied)
backend/fix_availability.py    - Incomplete availability logic (not used)
backend/update_views.py        - Incomplete views update script
backend/update_search_view.py  - Incomplete search view update script
```

**Why:** These were temporary fix scripts from earlier development phases. All logic has been integrated into the main codebase.

## Frontend Broken File (1 file)
```
src/components/PaymentPage.broken.tsx  - Incomplete/broken payment page implementation
```

**Why:** This was a fallback broken implementation. The main PaymentPage.tsx is the current working version.

## Deletion Command
```bash
git rm -f backend/fix_views.py backend/fix_endpoints.py backend/fix_availability.py
git rm -f backend/update_views.py backend/update_search_view.py
git rm -f src/components/PaymentPage.broken.tsx

git commit -m "cleanup: remove dead fix scripts and broken payment page"
```

Or manually delete these files from your file explorer and commit the changes.

## Verification
After cleanup, project should be cleaner with:
- Only essential code files
- No duplicate logic
- Clear separation between production code and test/temp scripts

Total removal: 6 files, ~2KB of dead code
