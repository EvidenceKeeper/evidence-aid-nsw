

## Deep Dive Code Review – Bugs & Incomplete Areas

### 🔴 Critical Bugs (will cause crashes / broken UX)

**1. Syntax error in `LiveCaseTimeline.tsx` (line 78)**
```tsx
<div className="p-4 border-b space-y-4">'   // ← stray apostrophe
```
This stray `'` after the opening div will render literal text `'` in the UI and may break JSX parsing in some cases. The right-hand timeline panel renders in `LawyerChat`, so this affects the main app screen.

**2. `useCasePlan` hook crashes for users with no `case_memory` row**
In `src/hooks/useCasePlan.ts` (line ~38) and `src/pages/LawyerChat.tsx` (line ~29), the queries use `.single()`:
```ts
.from('case_memory').select(...).eq('user_id', user.id).single();
```
`.single()` throws `PGRST116` when no row exists. New users have no `case_memory` row yet, so:
- `LawyerChat` will hit the catch block, never set `showOnboarding`, and may show the chat without onboarding.
- `useCasePlan` swallows the error in `loadCasePlan` but logs noisy errors.
Should use `.maybeSingle()`.

**3. Two competing onboarding flows are active**
- `Auth.tsx` triggers `LawyerChatOnboarding` / `GoalOnboarding` after sign-in (writes only `primary_goal` to `case_memory`).
- `LawyerChat.tsx` then shows the new `CasePlanOnboarding` because `active_case_plan_id` is still null.
Result: users go through onboarding twice and the first one's data is partially overwritten by the `generate-case-plan` upsert.

**4. Milestone progress is never actually updated**
The whole point of the new system is that `update-milestone-progress` runs after each chat message / evidence upload. But:
- `ChatInterface.tsx` never calls `update-milestone-progress` (grep confirms zero references).
- `evidence-orchestrator` doesn't call it either.
So milestone `completion_percentage` stays at 0 forever, the AI's "What's been collected" context will always say "Nothing yet", and the user never advances past Milestone 1.

### 🟠 High-Priority Issues

**5. `case_memory` upsert in `generate-case-plan` may fail RLS or wipe fields**
`supabase/functions/generate-case-plan/index.ts` line 159 upserts on `user_id`, but `case_memory` does not have a unique constraint on `user_id` shown in schema. The upsert with `onConflict: 'user_id'` will fail unless that unique constraint actually exists. Worth verifying.

**6. `generate-case-plan` uses ANON key, not service role**
Lines 16-17 use `SUPABASE_ANON_KEY`. The insert into `case_plans` will work via RLS (auth.uid() = user_id), but `case_memory` upsert could fail if the row was created by a trigger with a different owner. Safer to use service role for cross-table writes after auth check.

**7. Mobile Timeline toggle is a no-op**
`LawyerChat.tsx` line 82: `onClick={() => {/* TODO: Toggle timeline */}}` — button does nothing on mobile. Timeline is not viewable on mobile at all.

**8. Empty `generate-case-plan` requires no rate-limit / dedupe**
A user clicking "Generate" twice creates two `case_plans` rows. The `case_memory.active_case_plan_id` will point to the latest, but old plans + their `milestone_progress` rows pile up.

### 🟡 Medium-Priority Issues

**9. `update-milestone-progress` always re-marks status as `in_progress`**
Line 189 unconditionally sets the next milestone to `in_progress` even if it was previously `complete` (won't happen now but creates fragile state if user edits).

**10. `chat-gemini` `currentMilestone.success_criteria.map(...)` will throw if criteria is null** (line 519). No null guard.

**11. `MilestoneProgress` uses `currentMilestone.category` directly** without checking type — if AI returns an unexpected category, color falls back fine, but TS types are `any`.

**12. Stale onboarding state on skip**
`onSkip` in `CasePlanOnboarding` just sets `showOnboarding=false` without persisting anything, so the next page load will show onboarding again forever until a plan is generated.

**13. `milestone_progress` has no unique constraint on `(case_plan_id, milestone_index)`** — duplicate progress rows possible if function re-runs.

**14. `chat-gemini` intent classifier sends an extra AI call per message** even for simple chats (cost + latency). Confidence threshold 0.7 means most messages still trigger a routed call.

### 🟢 Low / Cleanup

**15. Legacy unused files**: `TelepathicContextProvider.tsx`, `GoalOnboarding.tsx`, `LawyerChatOnboarding.tsx`, parts of `useEnhancedMemory`, `useTelepathicIntelligence` — duplicative now that `UnifiedMemoryProvider` + `CasePlanOnboarding` exist.
**16.** `CaseOverviewDashboard.tsx` line 104 still has `keyParties: ["Complainant", "Respondent"], // TODO`.
**17.** `errorHandler.ts` uses `process.env.NODE_ENV` in browser code — Vite uses `import.meta.env.DEV`. Dev-only console logs never fire.
**18.** `chat-gemini` uses `@supabase/supabase-js@2.75.0`, but `generate-case-plan` and `update-milestone-progress` use `2.39.3` — version drift.
**19.** `LiveCaseTimeline.tsx` triggers `loadEvents()` on every realtime change with no debounce — will re-query rapidly during bulk inserts.

---

### Recommended Fix Priority

| Order | Fix |
|------|-----|
| 1 | Fix stray `'` in `LiveCaseTimeline.tsx` (build/render bug) |
| 2 | Replace `.single()` with `.maybeSingle()` in `LawyerChat` + `useCasePlan` |
| 3 | Wire `update-milestone-progress` into `ChatInterface` after each assistant response and into `evidence-orchestrator` after file processing |
| 4 | Remove the old `GoalOnboarding`/`LawyerChatOnboarding` flow from `Auth.tsx` so only `CasePlanOnboarding` runs |
| 5 | Add unique constraint `case_memory.user_id` (or change upsert) and `(case_plan_id, milestone_index)` on `milestone_progress` |
| 6 | Implement mobile timeline toggle |
| 7 | Cleanup: legacy onboarding/telepathic files, version alignment, env vars |

Approve and I'll implement fixes 1-6 in one pass.

