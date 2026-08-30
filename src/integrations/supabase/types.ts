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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          created_at: string
          fluency_notes: string | null
          grammar: Json | null
          id: string
          overall_summary: string | null
          pronunciation_notes: string | null
          raw: Json | null
          session_id: string
          user_id: string
          vocabulary: Json | null
        }
        Insert: {
          created_at?: string
          fluency_notes?: string | null
          grammar?: Json | null
          id?: string
          overall_summary?: string | null
          pronunciation_notes?: string | null
          raw?: Json | null
          session_id: string
          user_id: string
          vocabulary?: Json | null
        }
        Update: {
          created_at?: string
          fluency_notes?: string | null
          grammar?: Json | null
          id?: string
          overall_summary?: string | null
          pronunciation_notes?: string | null
          raw?: Json | null
          session_id?: string
          user_id?: string
          vocabulary?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      fx_cache: {
        Row: {
          base: string
          fetched_at: string
          rates: Json
        }
        Insert: {
          base: string
          fetched_at?: string
          rates: Json
        }
        Update: {
          base?: string
          fetched_at?: string
          rates?: Json
        }
        Relationships: []
      }
      levels: {
        Row: {
          code: string
          id: number
          name_ar: string
          name_en: string
          name_fr: string
          sort_order: number
        }
        Insert: {
          code: string
          id: number
          name_ar: string
          name_en: string
          name_fr: string
          sort_order: number
        }
        Update: {
          code?: string
          id?: number
          name_ar?: string
          name_en?: string
          name_fr?: string
          sort_order?: number
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          created_at: string
          id: string
          note: string | null
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          user_id?: string
        }
        Relationships: []
      }
      paypal_orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          order_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          order_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          order_id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          native_lang: Database["public"]["Enums"]["lang_code"] | null
          theme: string | null
          ui_lang: Database["public"]["Enums"]["lang_code"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          native_lang?: Database["public"]["Enums"]["lang_code"] | null
          theme?: string | null
          ui_lang?: Database["public"]["Enums"]["lang_code"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          native_lang?: Database["public"]["Enums"]["lang_code"] | null
          theme?: string | null
          ui_lang?: Database["public"]["Enums"]["lang_code"] | null
          updated_at?: string
        }
        Relationships: []
      }
      session_usage: {
        Row: {
          created_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          audio_path: string | null
          created_at: string
          duration_sec: number | null
          id: string
          language: Database["public"]["Enums"]["lang_code"]
          level_id: number
          score: number | null
          status: string
          topic_id: string | null
          topic_prompt: string
          transcript: string | null
          user_id: string
        }
        Insert: {
          audio_path?: string | null
          created_at?: string
          duration_sec?: number | null
          id?: string
          language: Database["public"]["Enums"]["lang_code"]
          level_id: number
          score?: number | null
          status?: string
          topic_id?: string | null
          topic_prompt: string
          transcript?: string | null
          user_id: string
        }
        Update: {
          audio_path?: string | null
          created_at?: string
          duration_sec?: number | null
          id?: string
          language?: Database["public"]["Enums"]["lang_code"]
          level_id?: number
          score?: number | null
          status?: string
          topic_id?: string | null
          topic_prompt?: string
          transcript?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount_mad: number | null
          amount_minor: number | null
          approved_by: string | null
          created_at: string
          currency: string | null
          id: string
          paid_at: string | null
          payment_provider: string | null
          paypal_capture_id: string | null
          paypal_order_id: string | null
          plan: string
          status: Database["public"]["Enums"]["subscription_status"]
          user_id: string
        }
        Insert: {
          amount_mad?: number | null
          amount_minor?: number | null
          approved_by?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          paid_at?: string | null
          payment_provider?: string | null
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          plan?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          user_id: string
        }
        Update: {
          amount_mad?: number | null
          amount_minor?: number | null
          approved_by?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          paid_at?: string | null
          payment_provider?: string | null
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          plan?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          user_id?: string
        }
        Relationships: []
      }
      topic_cache: {
        Row: {
          created_at: string
          id: string
          interests_hash: string
          is_public: boolean
          lang: string
          level: string
          prompt: string
        }
        Insert: {
          created_at?: string
          id?: string
          interests_hash: string
          is_public?: boolean
          lang: string
          level: string
          prompt: string
        }
        Update: {
          created_at?: string
          id?: string
          interests_hash?: string
          is_public?: boolean
          lang?: string
          level?: string
          prompt?: string
        }
        Relationships: []
      }
      topic_generation_log: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          category: string | null
          created_at: string
          id: string
          language: Database["public"]["Enums"]["lang_code"]
          level_id: number
          prompt: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          language: Database["public"]["Enums"]["lang_code"]
          level_id: number
          prompt: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          language?: Database["public"]["Enums"]["lang_code"]
          level_id?: number
          prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          interests: string[]
          level_code: string
          onboarded_at: string | null
          target_language: string
          updated_at: string
          user_id: string
          weekly_goal: number
        }
        Insert: {
          created_at?: string
          interests?: string[]
          level_code?: string
          onboarded_at?: string | null
          target_language?: string
          updated_at?: string
          user_id: string
          weekly_goal?: number
        }
        Update: {
          created_at?: string
          interests?: string[]
          level_code?: string
          onboarded_at?: string | null
          target_language?: string
          updated_at?: string
          user_id?: string
          weekly_goal?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      rankings: {
        Row: {
          display_name: string | null
          language: Database["public"]["Enums"]["lang_code"] | null
          sessions_count: number | null
          total_score: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      lang_code: "en" | "fr" | "ar"
      payment_status: "pending" | "approved" | "rejected"
      subscription_status:
        | "active"
        | "pending"
        | "rejected"
        | "expired"
        | "refunded"
        | "canceled"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "user"],
      lang_code: ["en", "fr", "ar"],
      payment_status: ["pending", "approved", "rejected"],
      subscription_status: [
        "active",
        "pending",
        "rejected",
        "expired",
        "refunded",
        "canceled",
      ],
    },
  },
} as const
