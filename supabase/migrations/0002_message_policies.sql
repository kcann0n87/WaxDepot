-- Allow either side of a conversation to update conversation rows
-- (used to bump last_message_at + clear the unread flag).
create policy "conversations members update" on conversations
  for update using (auth.uid() = buyer_id or auth.uid() = other_id);

-- Allow either side of a conversation to insert it (so a seller can also
-- start a thread, not just a buyer).
drop policy if exists "conversations buyer insert" on conversations;
create policy "conversations members insert" on conversations
  for insert with check (auth.uid() = buyer_id or auth.uid() = other_id);
