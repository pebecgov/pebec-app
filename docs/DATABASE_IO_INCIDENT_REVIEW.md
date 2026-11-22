# Database I/O Cost Incident — Technical Review

**Project:** `pebec` (Convex production `kindred-fox-158`)  
**Billing window:** 20 Oct 2026 – 16 Nov 2026  
**Document date:** 22 Nov 2026  
**Status:** Fixes implemented; pending deploy + usage-limit configuration

---

## 1. Executive summary

Production incurred **~$53.28** in on-demand Database I/O beyond the included ~50 GB allowance.

| Metric | Value |
|--------|------:|
| Included Database I/O | 49.52 GB |
| On-demand Database I/O | **+265.78 GB** |
| Total Database I/O | ~315 GB |
| On-demand spend | **$53.28** |
| Function-call overage spend | $0.09 (immaterial) |

Database I/O measures **bytes read/written while functions run**, not stored size (DB storage was only ~678 MB). A small table can still generate large I/O if queries scan it repeatedly or load oversized documents.

Four production functions accounted for the vast majority of I/O:

| Rank | Function | Database I/O | Share of ~315 GB |
|-----:|----------|-------------:|-----------------:|
| 1 | `tickets.getTopAndBottomMdaPerformanceByMonth` | **104.02 GB** | ~33% |
| 2 | `internal_reports.getStorageUrl` | **63.52 GB** | ~20% |
| 3 | `public_scores.getPublicMdaScores` | **56.42 GB** | ~18% |
| 4 | `users.checkEmailExists` | **9.64 GB** | ~3% |
| | **Top 4 combined** | **~233.6 GB** | **~74%** |

---

## 2. Root causes

### 2.1 `tickets.getTopAndBottomMdaPerformanceByMonth` (~104 GB)

**Used by:** public/admin ReportGov “Top MDAs” widget (`components/ReportGov/TopMDAS.tsx`) via live `useQuery`.

**Bug:** Queried tickets with `.filter()` on `createdAt` **without using the existing `byCreatedAt` index**. In Convex, `.filter()` still scans matching index range (here: effectively the whole table), and every scanned document counts toward Database I/O.

```ts
// BEFORE (full-table scan)
ctx.db.query("tickets").filter(q => q.and(
  q.gte(q.field("createdAt"), from),
  q.lte(q.field("createdAt"), to),
)).collect();
```

Because this is a reactive query, **any ticket write** can invalidate subscribers and re-run the scan for open pages — multiplying cost under traffic.

### 2.2 `internal_reports.getStorageUrl` (~64 GB)

**Used by:** many report download/preview pages (admin, staff, reform champion, deputies, magistrates, etc.). High call volume (~174K function calls in the same period).

**Bug:** After resolving the storage URL, looked up `uploaded_files` with `.filter(storageId === …)` and **no index**, scanning the entire `uploaded_files` table on every download/preview.

```ts
// BEFORE
ctx.db.query("uploaded_files").filter(q => q.eq(q.field("storageId"), storageId)).first();
```

### 2.3 `public_scores.getPublicMdaScores` (~56 GB)

**Used by:** public MDA tracker (`/tracker/mdas`, slug pages) — anonymous / high traffic.

**Bug:** Each visitor invocation called `mda_scoring.getAllMdaSavedDataForDashboard` (full live-dashboard aggregation across scoring tables). Public page views therefore repeatedly paid the cost of rebuilding the entire admin dashboard dataset.

### 2.4 `users.checkEmailExists` (~10 GB)

**Used by:** citizen ticket form (`components/UserTicketForm`) as a live `useQuery` bound to the email field.

**Bugs:**
1. Looked up users with `.filter(email)` despite an existing `byEmail` index → full users-table scan per call.
2. Client fired the query on essentially every keystroke (no debounce) → many redundant scans while typing.

---

## 3. Fixes implemented

### 3.1 Top/bottom MDA performance — use `byCreatedAt`

**File:** `convex/tickets.ts`

```ts
// AFTER — range scan only for the selected month
ctx.db.query("tickets")
  .withIndex("byCreatedAt", q => q.gte("createdAt", from).lte("createdAt", to))
  .collect();
```

**Expected impact:** I/O scales with tickets **in that month**, not the full history. Largest single cost reduction.

### 3.2 Storage URL — index `uploaded_files` by `storageId`

**Files:** `convex/schema.ts`, `convex/internal_reports.ts`

- Added index: `uploaded_files.byStorageId` on `["storageId"]`
- Lookup switched to `.withIndex("byStorageId", q => q.eq("storageId", storageId)).first()`

**Expected impact:** O(1)-ish indexed read per call instead of full table scan × ~174K calls.

### 3.3 Public MDA scores — snapshot cache

**Files:** `convex/schema.ts`, `convex/public_scores.ts`, `convex/crons.ts`

- New table: `public_mda_scores_cache` (`year`, `payload`, `updatedAt`) indexed by `byYear`
- `getPublicMdaScores` **reads the cache** (tiny document) for public traffic
- `refreshPublicMdaScoresCache` (internal mutation) rebuilds the snapshot from the live dashboard pipeline
- Cron: refresh every **15 minutes**
- Cold start (no cache row yet): falls back to live compute once until cron fills the cache

**Expected impact:** Public tracker visits no longer each rebuild the full dashboard (~56 GB class of spend). Rebuild cost is paid ~96 times/month via cron instead of once per visitor.

**Note:** Public tracker data may lag score edits by up to ~15 minutes. Admin live dashboard is unchanged.

### 3.4 Email existence check — index + debounce

**Files:** `convex/users.ts`, `components/UserTicketForm/index.tsx`

- Server: `.withIndex("byEmail", …)` (plus case-fallback lookup)
- Client: **400ms debounce** before calling the query

**Expected impact:** Indexed point lookups + far fewer calls while typing.

---

## 4. What we did *not* change (and why)

| Area | Reason |
|------|--------|
| Admin live scoring dashboard | Still needs fresh aggregation; cost is admin-gated, not public-scale |
| `tracker_presence.heartbeat` | High **call count**, low **I/O** in the bandwidth breakdown — not the $53 driver |
| Broader ticket list pagination | Real follow-up, but not in the top-4 I/O chart for this invoice |

---

## 5. Operational recommendations (post-deploy)

1. **Set Convex Usage Limits** on production Database I/O  
   - Example: warn at **30 GB**, hard disable around **50–80 GB** (calendar window; tune to risk tolerance).  
   - A hard limit can temporarily pause the deployment — choose consciously.

2. **Deploy these schema/index changes** to `kindred-fox-158` and confirm index backfill completes for `uploaded_files.byStorageId`.

3. **Seed cache immediately** after deploy (optional but recommended):  
   run `internal.public_scores.refreshPublicMdaScoresCache` once so the public tracker does not cold-start on live compute.

4. **Re-check Usage → Database I/O** after 48–72 hours. Top functions should drop sharply for the four names above.

5. **Follow-ups (next sprint)**  
   - Paginate admin `getAllTickets` / report list APIs that still `.collect()` full tables  
   - Avoid returning `submitted_reports.data` (embedded Excel grids) in list queries  
   - Consider invalidating/refreshing `public_mda_scores_cache` on score-save mutations for tighter freshness than 15 minutes

---

## 6. Verification checklist

- [ ] Convex deploy succeeds (new index + cache table)
- [ ] ReportGov Top MDAs widget still returns top/bottom for the selected month
- [ ] Report file download/preview still returns URL + filename
- [ ] `/tracker/mdas` loads scores (after cache seed or first cron)
- [ ] Ticket form email check still detects existing users (debounced)
- [ ] Usage Limits configured on production
- [ ] Database I/O for the four functions trends down on next usage sample

---

## 7. Risk assessment

| Change | Functional risk | Mitigation |
|--------|-----------------|------------|
| Tickets date index query | Low — same results, fewer docs read | Existing `byCreatedAt` index already in schema |
| `uploaded_files` index | Low — additive index | Convex backfills; lookup semantics unchanged |
| Public scores cache | Medium — up to 15 min lag on public tracker | Cron refresh; admin dashboard stays live; cold fallback |
| Email index + debounce | Low — slight delay before “email exists” UI | 400ms debounce; dual case lookup |

---

## 8. Bottom line for review

The overage was **not** mysterious storage growth. It was **repeated full-table (or full-dashboard) reads** on hot public/admin paths. The four fixes target ~74% of measured Database I/O with localized, behavior-preserving changes. Remaining spend risk is best controlled with **usage limits** plus follow-up pagination/slim-list work on other `.collect()` hotspots.
