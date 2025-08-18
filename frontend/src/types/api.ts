// API Types for LinkedIn Automation Platform

export interface User {
  id: string;
  email: string;
  full_name: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  user_id: string;
  organization_id?: string;
  intake_json: CampaignIntake;
  created_at: string;
  updated_at: string;
}

export interface CampaignIntake {
  target_audience: {
    job_titles: string[];
    industries: string[];
    company_sizes: string[];
    locations: string[];
    seniority_levels: string[];
  };
  value_proposition: {
    pain_points: string[];
    solutions: string[];
    unique_differentiators: string[];
    social_proof: string[];
  };
  outreach_strategy: {
    preferred_channels: string[];
    message_tone: 'professional' | 'casual' | 'friendly';
    call_to_action: string;
    follow_up_cadence: number;
  };
  goals_metrics: {
    primary_goal: string;
    target_response_rate: number;
    target_meetings_per_week: number;
    success_metrics: string[];
  };
}

export interface Prospect {
  id: string;
  campaign_id: string;
  linkedin_url: string;
  full_name?: string;
  email?: string;
  title?: string;
  company?: string;
  location?: string;
  industry?: string;
  status: 'new' | 'processing' | 'analyzed' | 'contacted' | 'responded' | 'converted' | 'failed';
  fit_score?: number;
  hooks?: string[];
  profile_json?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  campaign_id: string;
  prospect_id: string;
  message_type: 'connection_request' | 'first_message' | 'follow_up' | 'thank_you';
  subject?: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'responded';
  scheduled_at?: string;
  sent_at?: string;
  response_content?: string;
  created_at: string;
  updated_at: string;
}

export interface Sequence {
  id: string;
  campaign_id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  prospect_filters?: Record<string, any>;
  steps?: SequenceStep[];
  prospects?: SequenceProspect[];
  created_at: string;
  updated_at: string;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  action_type: 'connection_request' | 'message' | 'follow_up' | 'email';
  content: string;
  subject?: string;
  delay_days: number;
  conditions?: Record<string, any>;
  created_at: string;
}

export interface SequenceProspect {
  id: string;
  sequence_id: string;
  prospect_id: string;
  status: 'active' | 'paused' | 'completed';
  current_step: number;
  next_action_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  kind: string;
  campaign_id?: string;
  prospect_id?: string;
  message_id?: string;
  sequence_id?: string;
  payload_json?: Record<string, any>;
  created_at: string;
}

export interface Analytics {
  total_prospects: number;
  total_messages: number;
  response_rate: number;
  conversion_rate: number;
  campaigns_active: number;
  recent_activity: Event[];
  performance_by_campaign: CampaignPerformance[];
  message_performance: MessagePerformance[];
}

export interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  prospects_count: number;
  messages_sent: number;
  responses_received: number;
  response_rate: number;
  conversions: number;
  conversion_rate: number;
}

export interface MessagePerformance {
  type: string;
  sent: number;
  responses: number;
  response_rate: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  full_name: string;
  email: string;
  password: string;
  organization_name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
