/**
 * Authentication API functions
 */
import apiClient from './client';
import type { LoginCredentials, RegisterData, TokenResponse, User } from '../types';

export const authApi = {
  /**
   * Login user and get JWT tokens
   */
  login: async (credentials: LoginCredentials): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>('/auth/login/', credentials);
    return response.data;
  },

  /**
   * Register new user
   */
  register: async (data: RegisterData): Promise<User> => {
    const response = await apiClient.post<User>('/auth/register/', data);
    return response.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me/');
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refresh: string): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>('/auth/refresh/', { refresh });
    return response.data;
  },
};
