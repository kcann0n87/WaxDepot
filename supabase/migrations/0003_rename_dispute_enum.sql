-- Rename the "Awaiting WaxMarket" dispute_status enum value to "Awaiting WaxDepot"
-- following the brand rename. Idempotent — safe to re-run.
do $$
begin
  if exists (
    select 1 from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'dispute_status' and e.enumlabel = 'Awaiting WaxMarket'
  ) then
    alter type dispute_status rename value 'Awaiting WaxMarket' to 'Awaiting WaxDepot';
  end if;
end $$;
