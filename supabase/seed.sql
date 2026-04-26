-- Safe local/demo seed only. Never put production data here.
insert into ecommerce.app_themes (theme_name, colors, is_active) values ('default', '{"primary":"#111827","secondary":"#f59e0b","background":"#ffffff","foreground":"#111827"}'::jsonb, true) on conflict (theme_name) do nothing;
insert into ecommerce.app_fonts (font_name, font_family, font_display_name, google_font_url, css_font_family, is_active) values ('system', 'system-ui', 'System UI', null, 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', true) on conflict (font_name) do nothing;
