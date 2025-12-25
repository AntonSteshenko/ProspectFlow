/**
 * Global TypeScript types and interfaces
 */

export interface User {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  date_joined: string;
}

export interface ContactList {
  id: string;
  name: string;
  owner: string;
  owner_email: string;
  status: 'processing' | 'completed' | 'failed';
  metadata: Record<string, any>;
  contact_count: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  list: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface ColumnMapping {
  id: string;
  original_column: string;
  mapped_field: string;
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}
