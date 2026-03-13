## Task: Expand Meta Campaign Sync with Time Period Selection

**Status:** ✅ Completed
**Date:** 2026-03-12

### Implementation Summary

#### Phase 1: API Enhancement ✅
1. **Modified `/api/meta/sync` endpoint** to accept date range parameters:
   - `startDate` and `endDate` in ISO date format (e.g., "2026-02-01")
   - Defaults to today if not provided (backward compatible)
   - Maximum range: 30 days per request (prevents API timeout)
   - Returns `syncedDays` count and `dateRange` in response

#### Phase 2: UI - Time Period Selector ✅
2. **Added period selector buttons** left of SYNC NOW in Campaigns tab:
   - **TODAY** - Current date only
   - **WEEK** - Monday to today
   - **MONTH** - 1st of current month to today
   - **LAST MONTH** - Full previous month

3. **Visual feedback**:
   - Selected period button highlighted with blue background
   - Tooltips show date range description
   - Sync button shows spinner animation during operation
   - Status messages show "Syncing X days..." during operation

#### Phase 3: Traffic Results - Yearly View ✅
4. **Added "Yearly" sub-tab** to Traffic section:
   - Shows 12 months as summary rows
   - Each row displays: Month name, Organic, Paid, Total Leads, Organic %
   - Visual progress bar shows organic vs paid ratio
   - Months without data show "(no data)" and are not clickable

5. **Added expandable daily breakdown**:
   - Click any month row to expand daily view
   - Shows: Date, Campaign name, Organic, Paid, Total
   - Chevron rotates when expanded
   - Click again to collapse

#### Phase 4: Integration ✅
6. **Connected period selector to sync**:
   - Selected period determines date range sent to sync API
   - After sync, campaign data table refreshes automatically
   - Activity log shows detailed sync progress

### Files Modified
- `app/api/meta/sync/route.ts` - Added date range parameters, validation, day-by-day sync loop
- `app/components/SmmHub.tsx` - CampaignsTab component, Traffic tab, new Yearly view
- `app/components/SmmHub.tsx` - Added `trafficByMonth` useMemo, `expandedMonth` state

### API Design

**Sync endpoint:**
```typescript
POST /api/meta/sync
Body: {
  startDate?: string // ISO date "2026-02-01"
  endDate?: string   // ISO date "2026-02-28"
}

// Defaults to today if no dates provided
// Max range: 30 days per request
// Syncs day-by-day (one API call per day)
```

**Response:**
```typescript
{
  data: {
    message: 'Sync complete',
    upserts: number,
    logs: string[],
    syncedDays: number,
    dateRange?: { start: string, end: string }
  }
}
```

### UX Flow
1. User selects "Last Month" button (highlighted blue)
2. User clicks "↻ Sync Now"
3. Button shows spinner + "Syncing..."
4. Activity log shows: "Starting Meta API sync for Last Month (2026-02-01 to 2026-02-28)..."
5. After completion: "✓ Sync complete — 156 records upserted over 28 day(s)"
6. Campaign data refreshes automatically

### Yearly View Features
- **Monthly summary**: Aggregated organic/paid leads per month
- **Organic % indicator**: Color-coded progress bar (green ≥50%, yellow ≥20%, red <20%)
- **Expandable rows**: Click month to see daily breakdown
- **Empty state**: Shows message if no data for current year
- **Responsive**: Max 600px height with scroll

### Notes
- Sync is day-by-day (not batched) as requested - more reliable for large ranges
- Max 30 days per sync prevents API timeouts
- Yearly view only shows current year (can be extended later)
- Months without traffic data are not expandable
