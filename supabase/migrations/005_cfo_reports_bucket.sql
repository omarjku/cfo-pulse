insert into storage.buckets (id, name, public)
values ('cfo-reports', 'cfo-reports', true)
on conflict (id) do nothing;
