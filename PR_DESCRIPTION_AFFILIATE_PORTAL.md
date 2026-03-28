# feat: Affiliate Portal — Revenue Share Tracker

Closes #[issue]

## Summary

Adds a functional **Affiliate Portal** view for partners to track their **0.1% revenue share** from splits they referred via the V3 Splitter contract.

## What's Changed

### Backend
- `AffiliateService.getAffiliateSplits(address, limit)` — queries all `Stream` records where `affiliateId` matches the caller, returning split metadata and the computed 0.1% affiliate cut per split.
- `GET /api/v2/affiliate/splits?address=<G...>` — new route exposing the above.

### Frontend
- `lib/hooks/use-affiliate-portal.ts` — fetches earnings summary + referred splits in parallel.
- `app/dashboard/affiliate/page.tsx` — **Affiliate Portal** page with:
  - Stats row: Total Earned / Pending Claim / Referred Splits count.
  - Paginated splits table showing sender, date, split total, and the affiliate's 0.1% cut per row.
- Sidebar nav item added under **Splitter**.

## How It Works

The V3 Splitter contract deducts **10 bps (0.1%)** from `total_amount` before distributing to recipients whenever an `affiliate` address is passed to `split()`. The backend already indexes these streams with `affiliateId`. This PR surfaces that data in a dedicated portal view.

## Labels
`[Frontend]` `[Backend]` `Data-Viz` `Medium`
