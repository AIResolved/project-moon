-- Create prompts table for storing script generation prompt templates
create table public.prompts (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  prompt text null,
  title text null,
  theme text null,
  audience text null,
  additional_context text null,
  "POV" text null,
  format text null,
  constraint prompts_pkey primary key (id)
) TABLESPACE pg_default;

-- Enable Row Level Security
alter table public.prompts enable row level security;

-- Create policies (allow all operations for now - you may want to restrict this based on your auth setup)
create policy "Allow all operations on prompts" on public.prompts for all using (true); 