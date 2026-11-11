export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_agents: {
        Row: {
          capabilities: string[]
          config: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          model: string
          name: string
          provider: string
          system_prompt: string | null
          updated_at: string
        }
        Insert: {
          capabilities?: string[]
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          model?: string
          name: string
          provider?: string
          system_prompt?: string | null
          updated_at?: string
        }
        Update: {
          capabilities?: string[]
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          model?: string
          name?: string
          provider?: string
          system_prompt?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          created_at: string
          google_calendar_event_id: string | null
          id: string
          lead_id: string
          notes: string | null
          procedure_name: string
          reminder_24h_sent: boolean
          reminder_48h_sent: boolean
          scheduled_at: string
          status: Database["public"]["Enums"]["appointment_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          google_calendar_event_id?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          procedure_name: string
          reminder_24h_sent?: boolean
          reminder_48h_sent?: boolean
          scheduled_at: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          google_calendar_event_id?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          procedure_name?: string
          reminder_24h_sent?: boolean
          reminder_48h_sent?: boolean
          scheduled_at?: string
          status?: Database["public"]["Enums"]["appointment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          agent_id: string | null
          assigned_to: string | null
          avatar_url: string | null
          channel: string
          contact_name: string | null
          created_at: string
          id: string
          is_archived: boolean
          labels: string[]
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          metadata: Json | null
          phone_normalized: string | null
          status: string
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string | null
          whatsapp_number: string | null
          whatsapp_session_id: string | null
        }
        Insert: {
          agent_id?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          channel?: string
          contact_name?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          labels?: string[]
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_id?: string | null
          metadata?: Json | null
          phone_normalized?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          whatsapp_instance_id?: string | null
          whatsapp_number?: string | null
          whatsapp_session_id?: string | null
        }
        Update: {
          agent_id?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          channel?: string
          contact_name?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          labels?: string[]
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_id?: string | null
          metadata?: Json | null
          phone_normalized?: string | null
          status?: string
          unread_count?: number
          updated_at?: string
          whatsapp_instance_id?: string | null
          whatsapp_number?: string | null
          whatsapp_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_whatsapp_instance_id_fkey"
            columns: ["whatsapp_instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          media_type: string | null
          media_url: string | null
          metadata: Json | null
          role: string
          sender_name: string | null
          status: string
          whatsapp_message_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          direction?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          role?: string
          sender_name?: string | null
          status?: string
          whatsapp_message_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          metadata?: Json | null
          role?: string
          sender_name?: string | null
          status?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_labels: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      doctor_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          updated_at?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      integration_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      lead_attachments: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          lead_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          lead_id: string
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_attachments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          author: string
          content: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          author: string
          content: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          author?: string
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          ad_headline: string | null
          ad_id: string | null
          age: number | null
          antecipar: boolean
          attendance_status: string | null
          attendant: string | null
          city: string | null
          consult_value: number | null
          contact_1: string | null
          contact_2: string | null
          contact_3: string | null
          contact_4: string | null
          created_at: string
          ctwa_clid: string | null
          disqualification_reason: string | null
          disqualified_at: string | null
          email: string | null
          first_contact_date: string | null
          form_incomodo: string | null
          form_motivacao: string | null
          form_tempo: string | null
          id: string
          insurance: string | null
          landing_page: string | null
          last_interaction: string | null
          modality: string | null
          name: string
          next_step: string | null
          observation: string | null
          payment_amount: number | null
          payment_date: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_procedure: string | null
          payment_status: string
          phone: string
          phone_normalized: string | null
          procedure: string
          referral: string | null
          referrer: string | null
          reservation_fee: number | null
          scheduled_info: string | null
          sheet_imported: boolean
          source: string
          stage: Database["public"]["Enums"]["pipeline_stage"]
          temperature: string | null
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          ad_headline?: string | null
          ad_id?: string | null
          age?: number | null
          antecipar?: boolean
          attendance_status?: string | null
          attendant?: string | null
          city?: string | null
          consult_value?: number | null
          contact_1?: string | null
          contact_2?: string | null
          contact_3?: string | null
          contact_4?: string | null
          created_at?: string
          ctwa_clid?: string | null
          disqualification_reason?: string | null
          disqualified_at?: string | null
          email?: string | null
          first_contact_date?: string | null
          form_incomodo?: string | null
          form_motivacao?: string | null
          form_tempo?: string | null
          id?: string
          insurance?: string | null
          landing_page?: string | null
          last_interaction?: string | null
          modality?: string | null
          name: string
          next_step?: string | null
          observation?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_procedure?: string | null
          payment_status?: string
          phone: string
          phone_normalized?: string | null
          procedure: string
          referral?: string | null
          referrer?: string | null
          reservation_fee?: number | null
          scheduled_info?: string | null
          sheet_imported?: boolean
          source: string
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          temperature?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          ad_headline?: string | null
          ad_id?: string | null
          age?: number | null
          antecipar?: boolean
          attendance_status?: string | null
          attendant?: string | null
          city?: string | null
          consult_value?: number | null
          contact_1?: string | null
          contact_2?: string | null
          contact_3?: string | null
          contact_4?: string | null
          created_at?: string
          ctwa_clid?: string | null
          disqualification_reason?: string | null
          disqualified_at?: string | null
          email?: string | null
          first_contact_date?: string | null
          form_incomodo?: string | null
          form_motivacao?: string | null
          form_tempo?: string | null
          id?: string
          insurance?: string | null
          landing_page?: string | null
          last_interaction?: string | null
          modality?: string | null
          name?: string
          next_step?: string | null
          observation?: string | null
          payment_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_procedure?: string | null
          payment_status?: string
          phone?: string
          phone_normalized?: string | null
          procedure?: string
          referral?: string | null
          referrer?: string | null
          reservation_fee?: number | null
          scheduled_info?: string | null
          sheet_imported?: boolean
          source?: string
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          temperature?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      pipeline_next_steps: {
        Row: {
          created_at: string
          description: string | null
          id: string
          stage: string
          step_order: number
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          stage: string
          step_order?: number
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          stage?: string
          step_order?: number
          title?: string
        }
        Relationships: []
      }
      procedures: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          must_change_password: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          must_change_password?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          must_change_password?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sheet_options: {
        Row: {
          category: string
          created_at: string
          id: string
          sort_order: number
          value: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          sort_order?: number
          value: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          sort_order?: number
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          created_at: string
          id: string
          instance_key: string
          is_active: boolean
          last_sync_at: string | null
          name: string
          phone_number: string | null
          provider: string
          qr_code: string | null
          secret_suffix: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_key: string
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          phone_number?: string | null
          provider?: string
          qr_code?: string | null
          secret_suffix?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_key?: string
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          phone_number?: string | null
          provider?: string
          qr_code?: string | null
          secret_suffix?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      format_lead_name: { Args: { input: string }; Returns: string }
      get_response_pairs: {
        Args: { p_days?: number }
        Returns: {
          contact_name: string
          conversation_id: string
          inbound_at: string
          replied_at: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      stage_rank: {
        Args: { s: Database["public"]["Enums"]["pipeline_stage"] }
        Returns: number
      }
    }
    Enums: {
      app_role: "mestre" | "administrativo" | "comercial"
      appointment_status: "pendente" | "confirmado" | "cancelado" | "realizado"
      pipeline_stage:
        | "novo_lead"
        | "contato_feito"
        | "consulta_agendada"
        | "consulta_realizada"
        | "procedimento_agendado"
        | "realizado"
        | "fornecedor"
        | "plano_apresentado"
        | "aguardando_decisao"
        | "procedimento_fechado"
        | "cirurgia_agendada"
        | "cirurgia_realizada"
        | "pos_procedimento"
        | "nao_fechou"
        | "contato_inexistente"
        | "lista_espera"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["mestre", "administrativo", "comercial"],
      appointment_status: ["pendente", "confirmado", "cancelado", "realizado"],
      pipeline_stage: [
        "novo_lead",
        "contato_feito",
        "consulta_agendada",
        "consulta_realizada",
        "procedimento_agendado",
        "realizado",
        "fornecedor",
        "plano_apresentado",
        "aguardando_decisao",
        "procedimento_fechado",
        "cirurgia_agendada",
        "cirurgia_realizada",
        "pos_procedimento",
        "nao_fechou",
        "contato_inexistente",
        "lista_espera",
      ],
    },
  },
} as const
