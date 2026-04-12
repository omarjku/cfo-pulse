create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'New Conversation',
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);
create index if not exists messages_conversation_idx on messages(conversation_id, created_at);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  size_bytes int,
  file_type text,
  created_at timestamptz default now()
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  fts tsvector generated always as (to_tsvector('english', content)) stored
);
create index if not exists document_chunks_fts_idx on document_chunks using gin(fts);
create index if not exists document_chunks_doc_idx on document_chunks(document_id);
