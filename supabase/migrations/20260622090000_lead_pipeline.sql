-- ════════════════════════════════════════════════════════════════
-- Phase 5 — lead pipeline upgrade (vision stages).
--
-- Replaces the generic new/contacted/qualified/won/lost statuses with the
-- product-vision funnel the AI auto-advances:
--   new_lead → quoted → scheduled → completed → repeat   (+ follow_up, lost)
--
-- The AI moves a lead forward as it quotes (calculate_quote), books
-- (book_appointment), and as jobs complete; staff can move it manually on
-- the pipeline board. Forward-only in app code so a later call can't demote
-- a won lead.
-- ════════════════════════════════════════════════════════════════

-- Drop the old CHECK first so the data migration can write the new values.
alter table public.leads drop constraint if exists leads_status_check;

-- Map existing rows onto the new stages.
update public.leads set status = case status
  when 'new'       then 'new_lead'
  when 'contacted' then 'new_lead'
  when 'qualified' then 'quoted'
  when 'won'       then 'completed'
  when 'lost'      then 'lost'
  else 'new_lead'
end;

alter table public.leads
  add constraint leads_status_check
  check (status in ('new_lead', 'quoted', 'scheduled', 'completed', 'follow_up', 'repeat', 'lost'));

alter table public.leads alter column status set default 'new_lead';
