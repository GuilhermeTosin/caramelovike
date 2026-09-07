-- Permite que usuários autenticados gerenciem somente os próprios favoritos.
-- As políticas RLS da migration 00040 continuam restringindo cada operação por user_id.
grant select, insert, delete on public.marketplace_favorites to authenticated;
