/**
 * Global TypeScript types and interfaces
 */

/**
 * Django REST Framework paginated response
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

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

export type ContactStatus = 'not_contacted' | 'in_working' | 'dropped' | 'converted';

export interface Contact {
  id: string;
  list: string;
  data: Record<string, any>;
  status: ContactStatus;
  in_pipeline: boolean;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  activities_count: number;
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

export type ActivityType = 'call' | 'email' | 'visit' | 'research';
export type ActivityResult = 'no' | 'followup' | 'lead';

export interface Activity {
  id: string;
  contact: string;
  author: string | null;
  author_email?: string;
  author_name: string;
  type: ActivityType;
  result: ActivityResult;
  date: string | null;  // ISO date YYYY-MM-DD
  content: string;
  metadata: Record<string, any>;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  can_edit: boolean;
  can_delete: boolean;
}

export interface ActivityCreate {
  contact: string;
  type: ActivityType;
  result: ActivityResult;
  date?: string | null;
  content?: string;
}

export interface ActivityUpdate {
  type?: ActivityType;
  result?: ActivityResult;
  date?: string | null;
  content?: string;
}

// Geocoding types
export interface GeocodingTemplate {
  fields: string[];
  separator: string;
}

export interface GeocodingProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface GeocodingResults {
  total: number;
  success: number;
  failed: number;
  skipped?: number;
}

export type GeocodingStatus = 'idle' | 'processing' | 'completed' | 'failed';

export interface GeocodingStatusResponse {
  geocoding_status: GeocodingStatus;
  geocoding_progress?: GeocodingProgress;
  geocoding_results?: GeocodingResults;
  geocoding_started_at?: string;
  geocoding_completed_at?: string;
  geocoding_error?: string;
}

export interface GeocodingStartResponse {
  task_id: string;
  message: string;
  total_contacts: number;
}
