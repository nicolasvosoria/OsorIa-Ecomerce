-- Create component_styles table for storing dynamic styles
create table if not exists public.component_styles (
  id bigint generated always as identity not null,
  component_name text not null unique,
  variables jsonb not null,
  updated_at timestamp without time zone null default now(),
  constraint component_styles_pkey primary key (id)
);

-- Enable RLS
alter table public.component_styles enable row level security;

-- Create policy to allow all operations for now (you can restrict this later)
create policy "Allow all operations on component_styles"
  on public.component_styles
  for all
  using (true)
  with check (true);

-- Insert default styles
insert into public.component_styles (component_name, variables)
values 
  ('hero', '{"title": "Desde el corazón del Huila para el mundo: Café de origen con historia", "description": "Descubre el sabor auténtico de un café cultivado en tierras de tradición cafetera. En HIGHLANDS Café cosechamos con pasión, procesamos con respeto por la naturaleza y llevamos hasta ti un café de especialidad con historia y carácter.", "buttonText": "Explora Nuestros Cafés"}'),
  ('header', '{"brandName": "Highlands", "brandSubtitle": "Café"}'),
  ('about', '{"ceoName": "Sofía Ramírez", "ceoTitle": "CEO"}')
on conflict (component_name) do nothing;
