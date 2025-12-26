/**
 * Contact Lists API functions
 */
import apiClient from './client';
import type { ContactList, ColumnMapping, PaginatedResponse, Activity, ActivityCreate, ActivityUpdate } from '../types';

export const listsApi = {
  /**
   * Get all contact lists
   */
  getLists: async (): Promise<PaginatedResponse<ContactList>> => {
    const response = await apiClient.get<PaginatedResponse<ContactList>>('/lists/');
    return response.data;
  },

  /**
   * Get single contact list with details
   */
  getList: async (id: string): Promise<ContactList> => {
    const response = await apiClient.get<ContactList>(`/lists/${id}/`);
    return response.data;
  },

  /**
   * Create new contact list
   */
  createList: async (name: string): Promise<ContactList> => {
    const response = await apiClient.post<ContactList>('/lists/', { name });
    return response.data;
  },

  /**
   * Update contact list
   */
  updateList: async (id: string, data: Partial<ContactList>): Promise<ContactList> => {
    const response = await apiClient.patch<ContactList>(`/lists/${id}/`, data);
    return response.data;
  },

  /**
   * Delete contact list
   */
  deleteList: async (id: string): Promise<void> => {
    await apiClient.delete(`/lists/${id}/`);
  },

  /**
   * Upload file and get preview
   */
  uploadFile: async (listId: string, formData: FormData): Promise<any> => {
    const response = await apiClient.post(`/lists/${listId}/upload/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Process file with column mappings
   */
  processFile: async (listId: string, file: File, mappings: Record<string, string>): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mappings', JSON.stringify(mappings));

    const response = await apiClient.post(`/lists/${listId}/process/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Get contacts for a list
   */
  getContacts: async (listId: string, search?: string, page?: number, ordering?: string, searchField?: string): Promise<any> => {
    const params: any = {};
    if (search) params.search = search;
    if (page) params.page = page;
    if (ordering) params.ordering = ordering;
    if (searchField) params.search_field = searchField;
    const response = await apiClient.get(`/lists/${listId}/contacts/`, { params });
    return response.data;
  },

  /**
   * Get column mappings for a list
   */
  getMappings: async (listId: string): Promise<ColumnMapping[]> => {
    const response = await apiClient.get<ColumnMapping[]>(`/lists/${listId}/mappings/`);
    return response.data;
  },

  /**
   * Save column mappings and trigger import
   */
  saveMappings: async (
    listId: string,
    data: { mappings: Record<string, { type: string; customName?: string }> }
  ): Promise<any> => {
    const response = await apiClient.post(`/lists/${listId}/save-mappings/`, data);
    return response.data;
  },

  /**
   * Process the import to create contacts from uploaded file
   */
  processImport: async (listId: string): Promise<any> => {
    const response = await apiClient.post(`/lists/${listId}/import/`);
    return response.data;
  },

  /**
   * Get activities for a contact
   */
  getActivities: async (contactId: string): Promise<Activity[]> => {
    const response = await apiClient.get<Activity[]>(`/contacts/${contactId}/activities/`);
    return response.data;
  },

  /**
   * Create a new comment
   */
  createActivity: async (data: ActivityCreate): Promise<Activity> => {
    const response = await apiClient.post<Activity>(`/contacts/${data.contact}/activities/`, data);
    return response.data;
  },

  /**
   * Update a comment
   */
  updateActivity: async (contactId: string, activityId: string, data: ActivityUpdate): Promise<Activity> => {
    const response = await apiClient.patch<Activity>(
      `/contacts/${contactId}/activities/${activityId}/`,
      data
    );
    return response.data;
  },

  /**
   * Delete a comment
   */
  deleteActivity: async (contactId: string, activityId: string): Promise<void> => {
    await apiClient.delete(`/contacts/${contactId}/activities/${activityId}/`);
  },
};
