/**
 * Contact Lists API functions
 */
import apiClient from './client';
import type { ContactList, Contact, ColumnMapping } from '../types';

export const listsApi = {
  /**
   * Get all contact lists
   */
  getLists: async (): Promise<ContactList[]> => {
    const response = await apiClient.get<ContactList[]>('/lists/');
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
  getContacts: async (listId: string, search?: string, page?: number): Promise<any> => {
    const params: any = {};
    if (search) params.search = search;
    if (page) params.page = page;
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
};
