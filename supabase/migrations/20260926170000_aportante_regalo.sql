-- Aportante "Regalo": lo que entra sin que lo ponga nadie de la familia (ej. el AAPL que regaló IOL
-- por abrir las cuentas de menores). Cuenta como aportado, así el rendimiento mide solo la inversión.
alter type public.aportante add value if not exists 'Regalo';
