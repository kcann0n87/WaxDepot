-- 0018_case_variants.sql
-- Extends the variant-derivation trigger from migration 0013/0016 to
-- recognize sealed-case versions of every box config — Mega Case,
-- Blaster Case, Hanger Case, Value Case, Jumbo Case, FOTL Hobby Case,
-- First Day Issue Hobby Case, Booster Box Case, etc.
--
-- Pattern: <box-config>-box  →  <box-config>-case
--   (e.g. mega-box  →  mega-case;  fotl-hobby-box → fotl-hobby-case)
--
-- The variant_group strips the case suffix the same way it strips the
-- box suffix, so a Mega Box and a Mega Case for the same release land
-- on the same product page as separate variant chips.
--
-- Idempotent: existing rows with matching slugs are re-derived only if
-- their variant_group/variant_type are still null (which they shouldn't
-- be after this point).

create or replace function _skus_derive_variant()
returns trigger as $$
begin
  if new.variant_group is null or new.variant_type is null then
    new.variant_group := case
      -- Cases (longest suffixes first)
      when new.slug like '%-first-day-issue-hobby-jumbo-case' then substring(new.slug for length(new.slug) - length('-first-day-issue-hobby-jumbo-case'))
      when new.slug like '%-first-day-issue-hobby-case'      then substring(new.slug for length(new.slug) - length('-first-day-issue-hobby-case'))
      when new.slug like '%-fotl-hobby-case'                 then substring(new.slug for length(new.slug) - length('-fotl-hobby-case'))
      when new.slug like '%-elite-trainer-box-case'          then substring(new.slug for length(new.slug) - length('-elite-trainer-box-case'))
      when new.slug like '%-booster-box-case'                then substring(new.slug for length(new.slug) - length('-booster-box-case'))
      when new.slug like '%-hobby-jumbo-case'                then substring(new.slug for length(new.slug) - length('-hobby-jumbo-case'))
      when new.slug like '%-hobby-case'                      then substring(new.slug for length(new.slug) - length('-hobby-case'))
      when new.slug like '%-jumbo-case'                      then substring(new.slug for length(new.slug) - length('-jumbo-case'))
      when new.slug like '%-mega-case'                       then substring(new.slug for length(new.slug) - length('-mega-case'))
      when new.slug like '%-blaster-case'                    then substring(new.slug for length(new.slug) - length('-blaster-case'))
      when new.slug like '%-hanger-case'                     then substring(new.slug for length(new.slug) - length('-hanger-case'))
      when new.slug like '%-value-case'                      then substring(new.slug for length(new.slug) - length('-value-case'))
      when new.slug like '%-inner-case'                      then substring(new.slug for length(new.slug) - length('-inner-case'))
      -- Boxes (longest suffixes first)
      when new.slug like '%-first-day-issue-hobby-jumbo-box' then substring(new.slug for length(new.slug) - length('-first-day-issue-hobby-jumbo-box'))
      when new.slug like '%-first-day-issue-hobby-box'       then substring(new.slug for length(new.slug) - length('-first-day-issue-hobby-box'))
      when new.slug like '%-fotl-hobby-box'                  then substring(new.slug for length(new.slug) - length('-fotl-hobby-box'))
      when new.slug like '%-hobby-jumbo-box'                 then substring(new.slug for length(new.slug) - length('-hobby-jumbo-box'))
      when new.slug like '%-elite-trainer-box'               then substring(new.slug for length(new.slug) - length('-elite-trainer-box'))
      when new.slug like '%-booster-box'                     then substring(new.slug for length(new.slug) - length('-booster-box'))
      when new.slug like '%-hobby-box'                       then substring(new.slug for length(new.slug) - length('-hobby-box'))
      when new.slug like '%-jumbo-box'                       then substring(new.slug for length(new.slug) - length('-jumbo-box'))
      when new.slug like '%-mega-box'                        then substring(new.slug for length(new.slug) - length('-mega-box'))
      when new.slug like '%-blaster-box'                     then substring(new.slug for length(new.slug) - length('-blaster-box'))
      when new.slug like '%-hanger-box'                      then substring(new.slug for length(new.slug) - length('-hanger-box'))
      when new.slug like '%-value-box'                       then substring(new.slug for length(new.slug) - length('-value-box'))
      else new.slug
    end;
    new.variant_type := case
      -- Cases
      when new.slug like '%-first-day-issue-hobby-jumbo-case' then 'first-day-issue-hobby-jumbo-case'
      when new.slug like '%-first-day-issue-hobby-case'       then 'first-day-issue-hobby-case'
      when new.slug like '%-fotl-hobby-case'                  then 'fotl-hobby-case'
      when new.slug like '%-elite-trainer-box-case'           then 'elite-trainer-box-case'
      when new.slug like '%-booster-box-case'                 then 'booster-box-case'
      when new.slug like '%-hobby-jumbo-case'                 then 'hobby-jumbo-case'
      when new.slug like '%-hobby-case'                       then 'hobby-case'
      when new.slug like '%-jumbo-case'                       then 'jumbo-case'
      when new.slug like '%-mega-case'                        then 'mega-case'
      when new.slug like '%-blaster-case'                     then 'blaster-case'
      when new.slug like '%-hanger-case'                      then 'hanger-case'
      when new.slug like '%-value-case'                       then 'value-case'
      when new.slug like '%-inner-case'                       then 'inner-case'
      -- Boxes
      when new.slug like '%-first-day-issue-hobby-jumbo-box'  then 'first-day-issue-hobby-jumbo-box'
      when new.slug like '%-first-day-issue-hobby-box'        then 'first-day-issue-hobby-box'
      when new.slug like '%-fotl-hobby-box'                   then 'fotl-hobby-box'
      when new.slug like '%-hobby-jumbo-box'                  then 'hobby-jumbo-box'
      when new.slug like '%-elite-trainer-box'                then 'elite-trainer-box'
      when new.slug like '%-booster-box'                      then 'booster-box'
      when new.slug like '%-hobby-box'                        then 'hobby-box'
      when new.slug like '%-jumbo-box'                        then 'jumbo-box'
      when new.slug like '%-mega-box'                         then 'mega-box'
      when new.slug like '%-blaster-box'                      then 'blaster-box'
      when new.slug like '%-hanger-box'                       then 'hanger-box'
      when new.slug like '%-value-box'                        then 'value-box'
      else 'box'
    end;
  end if;
  return new;
end;
$$ language plpgsql;
