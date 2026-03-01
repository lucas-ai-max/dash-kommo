-- Canal da IA: número que atende (ex: +55 41 8820-2618)
-- Permite filtrar métricas apenas para conversas deste canal
-- A integração que sincroniza chats deve preencher channel_phone
ALTER TABLE public.chats
ADD COLUMN IF NOT EXISTS channel_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_chats_channel_phone ON public.chats(channel_phone)
WHERE channel_phone IS NOT NULL;
