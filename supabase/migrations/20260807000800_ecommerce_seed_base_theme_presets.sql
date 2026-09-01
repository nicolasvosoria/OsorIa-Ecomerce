insert into ecommerce.app_themes (theme_name, colors, is_active)
values
  ('Tech', '{"primary":"#4a5568","secondary":"#5daba8","accent":"#5daba8","background":"#ffffff","foreground":"#1a1a1a","card":"#ffffff","cardForeground":"#1a1a1a","border":"#e2e8f0","muted":"#f7fafc","mutedForeground":"#718096"}'::jsonb, false),
  ('Minimal', '{"primary":"#1b1b18","secondary":"#eceae5","accent":"#8a8574","background":"#f6f5f2","foreground":"#1b1b18","card":"#fdfdfb","cardForeground":"#1b1b18","border":"#dcdad1","muted":"#edece7","mutedForeground":"#7a776b"}'::jsonb, false),
  ('Suave', '{"primary":"#ec6a80","secondary":"#fdeef0","accent":"#4faa98","background":"#fffdfb","foreground":"#4a3b34","card":"#ffffff","cardForeground":"#4a3b34","border":"#f2e7e2","muted":"#f8f1ee","mutedForeground":"#a2908a"}'::jsonb, false),
  ('Bold', '{"primary":"#0a0a0a","secondary":"#f0f0f0","accent":"#ff2d55","background":"#ffffff","foreground":"#0a0a0a","card":"#ffffff","cardForeground":"#0a0a0a","border":"#0a0a0a","muted":"#ededed","mutedForeground":"#4d4d4d"}'::jsonb, false),
  ('Boutique', '{"primary":"#b0603f","secondary":"#f2e5d5","accent":"#7d8b57","background":"#fbf4ec","foreground":"#4a3527","card":"#fffaf3","cardForeground":"#4a3527","border":"#e7d7c3","muted":"#f0e4d4","mutedForeground":"#997f66"}'::jsonb, false)
on conflict (theme_name) do nothing;

update ecommerce.app_theme_versions
set theme_id = (select id from ecommerce.app_themes where theme_name = 'Boutique'),
    is_custom = true
where theme_id = (select id from ecommerce.app_themes where theme_name = 'Cumbre Dorada');

do $$
begin
  if exists (
    select 1
    from ecommerce.app_theme_versions v
    join ecommerce.app_themes t on t.id = v.theme_id
    where t.theme_name in ('Cumbre Dorada', 'default')
  ) then
    raise exception 'app_theme_versions still references a non-base app_themes row (Cumbre Dorada/default); refusing to delete';
  end if;
end $$;

delete from ecommerce.app_themes where theme_name in ('Cumbre Dorada', 'default');
