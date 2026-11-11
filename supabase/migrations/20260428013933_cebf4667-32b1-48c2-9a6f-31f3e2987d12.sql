-- Bucket público para mídia do WhatsApp (imagens, vídeos, áudios, documentos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-media',
  'whatsapp-media',
  true,
  26214400, -- 25 MB
  NULL -- aceita qualquer mime
)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 26214400;

-- Policies: leitura pública (mídia visível no chat); escrita só auth/serviço
CREATE POLICY "Public can read whatsapp media"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');

CREATE POLICY "Auth can upload whatsapp media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media');

CREATE POLICY "Auth can update whatsapp media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'whatsapp-media');

CREATE POLICY "Auth can delete whatsapp media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'whatsapp-media');