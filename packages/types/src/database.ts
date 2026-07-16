/**
 * Tipos de la base de datos de ReadHub.
 *
 * Este archivo describe el esquema `public` para tipar de forma fuerte los
 * clientes de Supabase (`createBrowserClient<Database>`, `createServerClient<Database>`).
 *
 * Se mantiene alineado manualmente con las migraciones de `supabase/migrations`.
 * En sesiones posteriores puede regenerarse con:
 *   npx supabase gen types typescript --project-id <ref> > types/database.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "reader" | "writer" | "admin";

/**
 * Fila devuelta por las funciones `get_articles_feed` y `get_article_detail`:
 * artículo + nombre del autor + conteos agregados (views/likes/comments).
 */
export interface ArticleWithStats {
  id: string;
  title: string;
  summary: string | null;
  image_path: string | null;
  document_path: string | null;
  author_id: string;
  author_name: string | null;
  is_public: boolean;
  created_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
}

/** Fila devuelta por `get_article_comments`: comentario + nombre del autor. */
export interface CommentWithAuthor {
  id: string;
  article_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  author_name: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          birth_date: string | null;
          phone: string | null;
          role: UserRole;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          birth_date?: string | null;
          phone?: string | null;
          role?: UserRole;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          birth_date?: string | null;
          phone?: string | null;
          role?: UserRole;
          full_name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      articles: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          summary: string | null;
          document_path: string | null;
          image_path: string | null;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          summary?: string | null;
          document_path?: string | null;
          image_path?: string | null;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          title?: string;
          summary?: string | null;
          document_path?: string | null;
          image_path?: string | null;
          is_public?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey";
            columns: ["author_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      views: {
        Row: {
          id: string;
          article_id: string;
          user_id: string | null;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          user_id?: string | null;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          user_id?: string | null;
          viewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "views_article_id_fkey";
            columns: ["article_id"];
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "views_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      likes: {
        Row: {
          id: string;
          article_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "likes_article_id_fkey";
            columns: ["article_id"];
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "likes_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          article_id: string;
          user_id: string;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          user_id: string;
          comment: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          user_id?: string;
          comment?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey";
            columns: ["article_id"];
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          id: string;
          article_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          article_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_article_id_fkey";
            columns: ["article_id"];
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      article_embeddings: {
        Row: {
          article_id: string;
          embedding: string;
          content: string;
          updated_at: string;
        };
        Insert: {
          article_id: string;
          embedding: string;
          content: string;
          updated_at?: string;
        };
        Update: {
          article_id?: string;
          embedding?: string;
          content?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "article_embeddings_article_id_fkey";
            columns: ["article_id"];
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      match_articles: {
        Args: {
          query_embedding: string;
          match_count?: number;
          similarity_threshold?: number;
        };
        Returns: {
          article_id: string;
          title: string;
          summary: string | null;
          content: string;
          author_name: string | null;
          similarity: number;
        }[];
      };
      get_articles_feed: {
        Args: Record<string, never>;
        Returns: ArticleWithStats[];
      };
      get_article_detail: {
        Args: { p_article_id: string };
        Returns: ArticleWithStats[];
      };
      get_article_comments: {
        Args: { p_article_id: string };
        Returns: CommentWithAuthor[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

/** Helpers de conveniencia para acceder a filas tipadas. */
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
