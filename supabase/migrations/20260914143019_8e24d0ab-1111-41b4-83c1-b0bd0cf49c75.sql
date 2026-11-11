ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ctwa_clid text,
  ADD COLUMN IF NOT EXISTS ad_id text,
  ADD COLUMN IF NOT EXISTS ad_headline text;

CREATE INDEX IF NOT EXISTS leads_ctwa_clid_idx ON public.leads (ctwa_clid) WHERE ctwa_clid IS NOT NULL;
CREATE INDEX IF NOT EXISTS leads_utm_campaign_idx ON public.leads (utm_campaign) WHERE utm_campaign IS NOT NULL;