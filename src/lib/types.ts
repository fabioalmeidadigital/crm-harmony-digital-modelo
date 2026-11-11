import type { PipelineStage, LeadSource, Procedure } from "./constants";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  age?: number;
  city?: string;
  source: LeadSource;
  procedure: Procedure;
  stage: PipelineStage;
  created_at: string;
  updated_at: string;
  last_interaction?: string;
  next_step?: string;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  referrer?: string | null;
  landing_page?: string | null;
  ctwa_clid?: string | null;
  ad_id?: string | null;
  ad_headline?: string | null;
  payment_status?: string;
  payment_amount?: number | null;
  payment_method?: string | null;
  payment_date?: string | null;
  payment_notes?: string | null;
  payment_procedure?: string | null;
  form_incomodo?: string | null;
  form_tempo?: string | null;
  form_motivacao?: string | null;
  disqualification_reason?: string | null;
  disqualified_at?: string | null;
  attendance_status?: string | null;
  first_contact_date?: string | null;
  scheduled_info?: string | null;
  antecipar?: boolean;
  referral?: string | null;
  modality?: string | null;
  reservation_fee?: number | null;
  consult_value?: number | null;
  insurance?: string | null;
  observation?: string | null;
  temperature?: string | null;
  contact_1?: string | null;
  contact_2?: string | null;
  contact_3?: string | null;
  contact_4?: string | null;
  attendant?: string | null;
}

export interface PipelineNextStep {
  id: string;
  stage: string;
  step_order: number;
  title: string;
  description?: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  author: string;
  created_at: string;
}
