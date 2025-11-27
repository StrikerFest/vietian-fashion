-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Add embedding columns to your existing tables
-- Google's text-embedding-004 model produces 768-dimensional vectors
alter table collections add column if not exists embedding vector(768);
alter table categories add column if not exists embedding vector(768);

-- Create an index for faster querying (IVFFlat is good for speed/recall balance)
-- Note: Indexes are only effective with sufficient data rows (usually >1000), but definition is good to have.
create index on collections using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

create index on categories using ivfflat (embedding vector_cosine_ops)
    with (lists = 100);

-- Function to search collections by semantic similarity
create or replace function match_collections (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  name text,
  similarity float
)
language plpgsql
as $$
begin
return query
select
    collections.id,
    collections.name,
    1 - (collections.embedding <=> query_embedding) as similarity
from collections
where 1 - (collections.embedding <=> query_embedding) > match_threshold
order by collections.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Function to search categories (attributes) by semantic similarity
create or replace function match_categories (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  name text,
  parent_name text,
  similarity float
)
language plpgsql
as $$
begin
return query
select
    c.id,
    c.name,
    p.name as parent_name,
    1 - (c.embedding <=> query_embedding) as similarity
from categories c
         left join categories p on c.parent_id = p.id
where
    c.type = 'attribute' -- Only search attributes, not catalog nav
  and 1 - (c.embedding <=> query_embedding) > match_threshold
order by c.embedding <=> query_embedding
  limit match_count;
end;
$$;