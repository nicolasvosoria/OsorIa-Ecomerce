-- Safe local/demo seed only. Never put production data here.
insert into ecommerce.app_fonts (font_name, font_family, font_display_name, google_font_url, css_font_family, is_active) values ('system', 'system-ui', 'System UI', null, 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', true) on conflict (font_name) do nothing;
