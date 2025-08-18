import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { AxiosResponse } from 'axios';
import type {
  User,
  Campaign,
  Prospect,
  Message,
  Sequence,
  Event,
  Analytics,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ApiResponse,
  CampaignIntake
} from '../types/api';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  }

  async demoLogin(): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/demo-login', {});
    if (response.data.token) {
      localStorage.setItem('auth_token', response.data.token);
    }
    return response.data;
  }

  async logout(): Promise<void> {
    localStorage.removeItem('token');
  }

  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.get('/auth/me');
    return response.data.data!;
  }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    const response: AxiosResponse<ApiResponse<Campaign[]>> = await this.api.get('/campaigns');
    return response.data.data || [];
  }

  async getCampaign(id: string): Promise<Campaign> {
    const response: AxiosResponse<ApiResponse<Campaign>> = await this.api.get(`/campaigns/${id}`);
    return response.data.data!;
  }

  async createCampaign(data: { name: string; description?: string; intake_json: CampaignIntake }): Promise<Campaign> {
    const response: AxiosResponse<ApiResponse<Campaign>> = await this.api.post('/campaigns', data);
    return response.data.data!;
  }

  async updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign> {
    const response: AxiosResponse<ApiResponse<Campaign>> = await this.api.put(`/campaigns/${id}`, data);
    return response.data.data!;
  }

  async deleteCampaign(id: string): Promise<void> {
    await this.api.delete(`/campaigns/${id}`);
  }

  // Prospects
  async getProspects(campaignId?: string): Promise<Prospect[]> {
    const url = campaignId ? `/prospects?campaign_id=${campaignId}` : '/prospects';
    const response: AxiosResponse<ApiResponse<Prospect[]>> = await this.api.get(url);
    return response.data.data || [];
  }

  async getProspect(id: string): Promise<Prospect> {
    const response: AxiosResponse<ApiResponse<Prospect>> = await this.api.get(`/prospects/${id}`);
    return response.data.data!;
  }

  async createProspect(data: { campaign_id: string; linkedin_url: string; email?: string }): Promise<Prospect> {
    const response: AxiosResponse<ApiResponse<Prospect>> = await this.api.post('/prospects', data);
    return response.data.data!;
  }

  async uploadProspectsCsv(campaignId: string, file: File): Promise<{ imported: number; failed: number }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('campaign_id', campaignId);

    const response: AxiosResponse<ApiResponse<{ imported: number; failed: number }>> = await this.api.post(
      '/prospects/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  }

  async updateProspect(id: string, data: Partial<Prospect>): Promise<Prospect> {
    const response: AxiosResponse<ApiResponse<Prospect>> = await this.api.put(`/prospects/${id}`, data);
    return response.data.data!;
  }

  async deleteProspect(id: string): Promise<void> {
    await this.api.delete(`/prospects/${id}`);
  }

  // Messages
  async getMessages(campaignId?: string, prospectId?: string): Promise<Message[]> {
    let url = '/messages';
    const params = new URLSearchParams();
    if (campaignId) params.append('campaign_id', campaignId);
    if (prospectId) params.append('prospect_id', prospectId);
    if (params.toString()) url += `?${params.toString()}`;

    const response: AxiosResponse<ApiResponse<Message[]>> = await this.api.get(url);
    return response.data.data || [];
  }

  async getMessage(id: string): Promise<Message> {
    const response: AxiosResponse<ApiResponse<Message>> = await this.api.get(`/messages/${id}`);
    return response.data.data!;
  }

  async createMessage(data: {
    campaign_id: string;
    prospect_id: string;
    content: string;
    message_type: string;
    subject?: string;
    scheduled_at?: string;
  }): Promise<Message> {
    const response: AxiosResponse<ApiResponse<Message>> = await this.api.post('/messages', data);
    return response.data.data!;
  }

  async generateMessage(prospectId: string, messageTemplate: string): Promise<{ generated_message: string }> {
    const response: AxiosResponse<ApiResponse<{ generated_message: string }>> = await this.api.post(
      '/messages/generate',
      { prospect_id: prospectId, message_template: messageTemplate }
    );
    return response.data.data!;
  }

  async updateMessage(id: string, data: Partial<Message>): Promise<Message> {
    const response: AxiosResponse<ApiResponse<Message>> = await this.api.put(`/messages/${id}`, data);
    return response.data.data!;
  }

  async deleteMessage(id: string): Promise<void> {
    await this.api.delete(`/messages/${id}`);
  }

  // Sequences
  async getSequences(campaignId?: string): Promise<Sequence[]> {
    const url = campaignId ? `/sequences?campaign_id=${campaignId}` : '/sequences';
    const response: AxiosResponse<ApiResponse<Sequence[]>> = await this.api.get(url);
    return response.data.data || [];
  }

  async getSequence(id: string): Promise<Sequence> {
    const response: AxiosResponse<ApiResponse<Sequence>> = await this.api.get(`/sequences/${id}`);
    return response.data.data!;
  }

  async createSequence(data: Partial<Sequence>): Promise<Sequence> {
    const response: AxiosResponse<ApiResponse<Sequence>> = await this.api.post('/sequences', data);
    return response.data.data!;
  }

  async updateSequence(id: string, data: Partial<Sequence>): Promise<Sequence> {
    const response: AxiosResponse<ApiResponse<Sequence>> = await this.api.put(`/sequences/${id}`, data);
    return response.data.data!;
  }

  async deleteSequence(id: string): Promise<void> {
    await this.api.delete(`/sequences/${id}`);
  }

  // Events
  async getEvents(campaignId?: string, prospectId?: string): Promise<Event[]> {
    let url = '/events';
    const params = new URLSearchParams();
    if (campaignId) params.append('campaign_id', campaignId);
    if (prospectId) params.append('prospect_id', prospectId);
    if (params.toString()) url += `?${params.toString()}`;

    const response: AxiosResponse<ApiResponse<Event[]>> = await this.api.get(url);
    return response.data.data || [];
  }

  // Analytics
  async getAnalytics(): Promise<Analytics> {
    const response: AxiosResponse<ApiResponse<Analytics>> = await this.api.get('/analytics/dashboard');
    return response.data.data!;
  }

  async getCampaignAnalytics(campaignId: string): Promise<Analytics> {
    const response: AxiosResponse<ApiResponse<Analytics>> = await this.api.get(`/analytics/campaigns/${campaignId}/performance`);
    return response.data.data!;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response: AxiosResponse<{ status: string; timestamp: string }> = await this.api.get('/health');
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
