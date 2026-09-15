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
      catalog_items: {
        Row: {
          cover_url: string
          created_at: string
          favorite_rank: number | null
          favorited_at: string | null
          genre_ids: number[] | null
          id: string
          is_favorite: boolean
          owner_uid: string
          progress_minutes: number | null
          progress_season: number | null
          progress_seconds: number | null
          rating: number
          review: string
          runtime_minutes: number | null
          status: string
          title: string
          tmdb_id: number | null
          type: string
        }
        Insert: {
          cover_url: string
          created_at?: string
          favorite_rank?: number | null
          favorited_at?: string | null
          genre_ids?: number[] | null
          id: string
          is_favorite?: boolean
          owner_uid: string
          progress_minutes?: number | null
          progress_season?: number | null
          progress_seconds?: number | null
          rating?: number
          review?: string
          runtime_minutes?: number | null
          status: string
          title: string
          tmdb_id?: number | null
          type: string
        }
        Update: {
          cover_url?: string
          created_at?: string
          favorite_rank?: number | null
          favorited_at?: string | null
          genre_ids?: number[] | null
          id?: string
          is_favorite?: boolean
          owner_uid?: string
          progress_minutes?: number | null
          progress_season?: number | null
          progress_seconds?: number | null
          rating?: number
          review?: string
          runtime_minutes?: number | null
          status?: string
          title?: string
          tmdb_id?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_owner_uid_fkey"
            columns: ["owner_uid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_owner_uid_fkey"
            columns: ["owner_uid"]
            isOneToOne: false
            referencedRelation: "public_genre_prefs"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "catalog_items_owner_uid_fkey"
            columns: ["owner_uid"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["uid"]
          },
        ]
      }
      comments: {
        Row: {
          author_avatar_url: string | null
          author_name: string
          author_uid: string
          created_at: string
          edited_at: string | null
          id: string
          mentions: Json
          mentions_all: boolean
          post_id: string
          text: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name: string
          author_uid: string
          created_at?: string
          edited_at?: string | null
          id?: string
          mentions?: Json
          mentions_all?: boolean
          post_id: string
          text: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string
          author_uid?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          mentions?: Json
          mentions_all?: boolean
          post_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_uid_fkey"
            columns: ["author_uid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_uid_fkey"
            columns: ["author_uid"]
            isOneToOne: false
            referencedRelation: "public_genre_prefs"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "comments_author_uid_fkey"
            columns: ["author_uid"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          requested_by: string
          responded_at: string | null
          status: string
          uid_a: string
          uid_b: string
        }
        Insert: {
          created_at?: string
          requested_by: string
          responded_at?: string | null
          status: string
          uid_a: string
          uid_b: string
        }
        Update: {
          created_at?: string
          requested_by?: string
          responded_at?: string | null
          status?: string
          uid_a?: string
          uid_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "public_genre_prefs"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friendships_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friendships_uid_a_fkey"
            columns: ["uid_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_uid_a_fkey"
            columns: ["uid_a"]
            isOneToOne: false
            referencedRelation: "public_genre_prefs"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friendships_uid_a_fkey"
            columns: ["uid_a"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friendships_uid_b_fkey"
            columns: ["uid_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_uid_b_fkey"
            columns: ["uid_b"]
            isOneToOne: false
            referencedRelation: "public_genre_prefs"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "friendships_uid_b_fkey"
            columns: ["uid_b"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["uid"]
          },
        ]
      }
      likes: {
        Row: {
          avatar_url: string | null
          created_at: string
          liker_uid: string
          name: string
          post_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          liker_uid: string
          name: string
          post_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          liker_uid?: string
          name?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_liker_uid_fkey"
            columns: ["liker_uid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_liker_uid_fkey"
            columns: ["liker_uid"]
            isOneToOne: false
            referencedRelation: "public_genre_prefs"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "likes_liker_uid_fkey"
            columns: ["liker_uid"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_avatar_url: string | null
          actor_name: string
          actor_uid: string
          comment_id: string | null
          comment_preview: string | null
          created_at: string
          id: string
          post_cover_url: string
          post_id: string
          post_title: string
          read: boolean
          recipient_uid: string
          type: string
        }
        Insert: {
          actor_avatar_url?: string | null
          actor_name: string
          actor_uid: string
          comment_id?: string | null
          comment_preview?: string | null
          created_at?: string
          id?: string
          post_cover_url: string
          post_id: string
          post_title: string
          read?: boolean
          recipient_uid: string
          type: string
        }
        Update: {
          actor_avatar_url?: string | null
          actor_name?: string
          actor_uid?: string
          comment_id?: string | null
          comment_preview?: string | null
          created_at?: string
          id?: string
          post_cover_url?: string
          post_id?: string
          post_title?: string
          read?: boolean
          recipient_uid?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_uid_fkey"
            columns: ["actor_uid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_uid_fkey"
            columns: ["actor_uid"]
            isOneToOne: false
            referencedRelation: "public_genre_prefs"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "notifications_actor_uid_fkey"
            columns: ["actor_uid"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_uid_fkey"
            columns: ["recipient_uid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_uid_fkey"
            columns: ["recipient_uid"]
            isOneToOne: false
            referencedRelation: "public_genre_prefs"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "notifications_recipient_uid_fkey"
            columns: ["recipient_uid"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["uid"]
          },
        ]
      }
      posts: {
        Row: {
          author_avatar_url: string | null
          author_name: string
          author_uid: string
          comment_count: number
          cover_url: string
          created_at: string
          id: string
          like_count: number
          media_type: string
          mentions: Json
          mentions_all: boolean
          rating: number
          review: string
          title: string
          tmdb_id: number | null
          type: string
          visibility: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name: string
          author_uid: string
          comment_count?: number
          cover_url: string
          created_at?: string
          id?: string
          like_count?: number
          media_type: string
          mentions?: Json
          mentions_all?: boolean
          rating: number
          review?: string
          title: string
          tmdb_id?: number | null
          type: string
          visibility: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string
          author_uid?: string
          comment_count?: number
          cover_url?: string
          created_at?: string
          id?: string
          like_count?: number
          media_type?: string
          mentions?: Json
          mentions_all?: boolean
          rating?: number
          review?: string
          title?: string
          tmdb_id?: number | null
          type?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_uid_fkey"
            columns: ["author_uid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_uid_fkey"
            columns: ["author_uid"]
            isOneToOne: false
            referencedRelation: "public_genre_prefs"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "posts_author_uid_fkey"
            columns: ["author_uid"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["uid"]
          },
        ]
      }
      profiles: {
        Row: {
          auto_share_on_watched: boolean
          avatar_url: string | null
          birthdate: string | null
          cover_url: string | null
          created_at: string
          email: string
          favorite_genre_ids: number[]
          feed_visibility: string
          handle: string | null
          handle_lower: string | null
          id: string
          name: string
          name_lower: string | null
          profile_visibility: string
          role: string
        }
        Insert: {
          auto_share_on_watched?: boolean
          avatar_url?: string | null
          birthdate?: string | null
          cover_url?: string | null
          created_at?: string
          email: string
          favorite_genre_ids?: number[]
          feed_visibility?: string
          handle?: string | null
          handle_lower?: string | null
          id: string
          name: string
          name_lower?: string | null
          profile_visibility?: string
          role?: string
        }
        Update: {
          auto_share_on_watched?: boolean
          avatar_url?: string | null
          birthdate?: string | null
          cover_url?: string | null
          created_at?: string
          email?: string
          favorite_genre_ids?: number[]
          feed_visibility?: string
          handle?: string | null
          handle_lower?: string | null
          id?: string
          name?: string
          name_lower?: string | null
          profile_visibility?: string
          role?: string
        }
        Relationships: []
      }
    }
    Views: {
      favorites_public: {
        Row: {
          cover_url: string | null
          favorite_rank: number | null
          id: string | null
          media_type: string | null
          owner_uid: string | null
          rated_at: string | null
          rating: number | null
          title: string | null
          tmdb_id: number | null
          type: string | null
        }
        Insert: {
          cover_url?: string | null
          favorite_rank?: number | null
          id?: string | null
          media_type?: never
          owner_uid?: string | null
          rated_at?: string | null
          rating?: number | null
          title?: string | null
          tmdb_id?: number | null
          type?: string | null
        }
        Update: {
          cover_url?: string | null
          favorite_rank?: number | null
          id?: string | null
          media_type?: never
          owner_uid?: string | null
          rated_at?: string | null
          rating?: number | null
          title?: string | null
          tmdb_id?: number | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_owner_uid_fkey"
            columns: ["owner_uid"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_items_owner_uid_fkey"
            columns: ["owner_uid"]
            isOneToOne: false
            referencedRelation: "public_genre_prefs"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "catalog_items_owner_uid_fkey"
            columns: ["owner_uid"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["uid"]
          },
        ]
      }
      public_genre_prefs: {
        Row: {
          favorite_genre_ids: number[] | null
          uid: string | null
        }
        Insert: {
          favorite_genre_ids?: number[] | null
          uid?: string | null
        }
        Update: {
          favorite_genre_ids?: number[] | null
          uid?: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          cover_url: string | null
          handle: string | null
          handle_lower: string | null
          name: string | null
          name_lower: string | null
          profile_visibility: string | null
          uid: string | null
        }
        Insert: {
          avatar_url?: string | null
          cover_url?: string | null
          handle?: string | null
          handle_lower?: string | null
          name?: string | null
          name_lower?: string | null
          profile_visibility?: string | null
          uid?: string | null
        }
        Update: {
          avatar_url?: string | null
          cover_url?: string | null
          handle?: string | null
          handle_lower?: string | null
          name?: string | null
          name_lower?: string | null
          profile_visibility?: string | null
          uid?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _notify_mentions: {
        Args: {
          p_actor_avatar_url: string
          p_actor_name: string
          p_actor_uid: string
          p_comment_id?: string
          p_comment_preview?: string
          p_exclude: string[]
          p_mentions: Json
          p_mentions_all: boolean
          p_post_cover_url: string
          p_post_id: string
          p_post_title: string
        }
        Returns: undefined
      }
      add_comment: {
        Args: {
          p_mentions?: Json
          p_mentions_all?: boolean
          p_post_id: string
          p_text: string
        }
        Returns: {
          author_avatar_url: string | null
          author_name: string
          author_uid: string
          created_at: string
          edited_at: string | null
          id: string
          mentions: Json
          mentions_all: boolean
          post_id: string
          text: string
        }
        SetofOptions: {
          from: "*"
          to: "comments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      are_friends: { Args: { a: string; b: string }; Returns: boolean }
      can_read_post: { Args: { target_post_id: string }; Returns: boolean }
      can_uid_read_post: {
        Args: { target_post_id: string; target_uid: string }
        Returns: boolean
      }
      delete_my_account: { Args: never; Returns: undefined }
      generate_handle: { Args: { display_name: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_admin_email: { Args: { email: string }; Returns: boolean }
      is_handle_available: { Args: { candidate: string }; Returns: boolean }
      is_profile_public: { Args: { target_uid: string }; Returns: boolean }
      publish_post: {
        Args: {
          p_cover_url: string
          p_media_type: string
          p_mentions?: Json
          p_mentions_all?: boolean
          p_rating: number
          p_review: string
          p_title: string
          p_tmdb_id: number
          p_type: string
          p_visibility: string
        }
        Returns: {
          author_avatar_url: string | null
          author_name: string
          author_uid: string
          comment_count: number
          cover_url: string
          created_at: string
          id: string
          like_count: number
          media_type: string
          mentions: Json
          mentions_all: boolean
          rating: number
          review: string
          title: string
          tmdb_id: number | null
          type: string
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "posts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      toggle_like: {
        Args: { p_post_id: string }
        Returns: {
          out_like_count: number
          out_liked: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
