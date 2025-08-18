// AI Service for LinkedIn Automation Platform
// Handles message generation, prospect analysis, and personalization

export interface AIMessageRequest {
  prospectName?: string;
  prospectTitle?: string;
  prospectCompany?: string;
  prospectIndustry?: string;
  campaignGoal: string;
  messageTone: 'professional' | 'casual' | 'friendly';
  messageType: 'connection_request' | 'first_message' | 'follow_up' | 'thank_you';
  valueProposition?: string;
  painPoints?: string[];
  callToAction?: string;
  companyInfo?: string;
  previousMessages?: string[];
}

export interface AIMessageResponse {
  generatedMessage: string;
  confidence: number;
  suggestions: string[];
  personalizedElements: string[];
}

export interface ProspectAnalysis {
  fitScore: number;
  keyInsights: string[];
  recommendedApproach: string;
  personalizedHooks: string[];
  industryTrends: string[];
  connectionStrategy: string;
}

export interface MessageOptimization {
  originalMessage: string;
  optimizedMessage: string;
  improvements: string[];
  engagementPrediction: number;
  tone: string;
}

class AIService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  }

  // Generate personalized LinkedIn messages using AI
  async generateMessage(request: AIMessageRequest): Promise<AIMessageResponse> {
    try {
      const response = await fetch(`${this.baseURL}/ai/generate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('AI message generation failed:', error);
      // Fallback to template-based generation
      return this.generateFallbackMessage(request);
    }
  }

  // Analyze prospect for personalization opportunities
  async analyzeProspect(prospectData: {
    linkedinUrl: string;
    profileData?: any;
    company?: string;
    industry?: string;
    title?: string;
  }): Promise<ProspectAnalysis> {
    try {
      const response = await fetch(`${this.baseURL}/ai/analyze-prospect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(prospectData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Prospect analysis failed:', error);
      return this.generateFallbackAnalysis(prospectData);
    }
  }

  // Optimize existing messages for better engagement
  async optimizeMessage(message: string, context: {
    messageType: string;
    targetAudience: string;
    campaignGoal: string;
  }): Promise<MessageOptimization> {
    try {
      const response = await fetch(`${this.baseURL}/ai/optimize-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ message, context }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Message optimization failed:', error);
      return this.generateFallbackOptimization(message, context);
    }
  }

  // Generate multiple message variations for A/B testing
  async generateMessageVariations(baseMessage: string, count: number = 3): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/ai/generate-variations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ baseMessage, count }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data.variations;
    } catch (error) {
      console.error('Message variation generation failed:', error);
      return this.generateFallbackVariations(baseMessage, count);
    }
  }

  // Extract key insights from prospect's LinkedIn profile
  async extractProfileInsights(profileText: string): Promise<{
    skills: string[];
    interests: string[];
    commonConnections: string[];
    recentActivity: string[];
    personalizedOpeners: string[];
  }> {
    try {
      const response = await fetch(`${this.baseURL}/ai/extract-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ profileText }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Profile insight extraction failed:', error);
      return {
        skills: [],
        interests: [],
        commonConnections: [],
        recentActivity: [],
        personalizedOpeners: []
      };
    }
  }

  // Predict message engagement likelihood
  async predictEngagement(message: string, prospectData: any): Promise<{
    engagementScore: number;
    factors: string[];
    recommendations: string[];
  }> {
    try {
      const response = await fetch(`${this.baseURL}/ai/predict-engagement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ message, prospectData }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Engagement prediction failed:', error);
      return {
        engagementScore: 0.5,
        factors: ['Unable to analyze'],
        recommendations: ['Check message clarity and personalization']
      };
    }
  }

  // Fallback methods for when AI services are unavailable
  private generateFallbackMessage(request: AIMessageRequest): AIMessageResponse {
    const templates = {
      connection_request: `Hi ${request.prospectName || '[Name]'}, I noticed your experience in ${request.prospectIndustry || 'your industry'} and would love to connect and share insights about ${request.campaignGoal}.`,
      first_message: `Hi ${request.prospectName || '[Name]'}, thanks for connecting! I saw your work at ${request.prospectCompany || '[Company]'} and thought you might be interested in ${request.valueProposition || 'what we do'}.`,
      follow_up: `Hi ${request.prospectName || '[Name]'}, following up on my previous message about ${request.campaignGoal}. Would you be interested in a brief chat?`,
      thank_you: `Thank you for your time, ${request.prospectName || '[Name]'}! Looking forward to staying in touch.`
    };

    return {
      generatedMessage: templates[request.messageType] || templates.connection_request,
      confidence: 0.7,
      suggestions: ['Add more personalization', 'Include specific value proposition'],
      personalizedElements: ['Name', 'Company']
    };
  }

  private generateFallbackAnalysis(_prospectData: any): ProspectAnalysis {
    return {
      fitScore: 0.75,
      keyInsights: ['Professional background matches target criteria'],
      recommendedApproach: 'Professional and value-focused outreach',
      personalizedHooks: ['Industry experience', 'Company background'],
      industryTrends: ['Digital transformation', 'Remote work adaptation'],
      connectionStrategy: 'Lead with industry insights and mutual value'
    };
  }

  private generateFallbackOptimization(message: string, context: any): MessageOptimization {
    return {
      originalMessage: message,
      optimizedMessage: message,
      improvements: ['Consider adding more personalization'],
      engagementPrediction: 0.6,
      tone: context.messageType || 'professional'
    };
  }

  private generateFallbackVariations(baseMessage: string, count: number): string[] {
    const variations = [];
    for (let i = 0; i < count; i++) {
      variations.push(`${baseMessage} (Variation ${i + 1})`);
    }
    return variations;
  }

  // Additional methods for AICampaignBuilder
  async generateCampaignGoals(_campaignName: string): Promise<string[]> {
    try {
      // In a real implementation, this would call the AI service
      return [
        'Increase brand awareness in the target market',
        'Generate high-quality leads for sales team',
        'Build relationships with industry decision makers',
        'Establish thought leadership in the space'
      ];
    } catch (error) {
      console.error('Error generating campaign goals:', error);
      return ['Increase brand awareness', 'Generate leads', 'Build relationships'];
    }
  }

  async refineTargetAudience(_audienceDescription: string): Promise<string[]> {
    try {
      // In a real implementation, this would call the AI service
      return [
        'C-level executives in technology companies',
        'VP-level decision makers in mid-market companies',
        'Directors of operations in growth-stage startups',
        'Senior managers in enterprise organizations'
      ];
    } catch (error) {
      console.error('Error refining target audience:', error);
      return ['Decision makers', 'Industry professionals', 'Potential clients'];
    }
  }

  async generateMessages(request: { messageType: string, tone: string, audience: string }): Promise<string[]> {
    try {
      // In a real implementation, this would call the AI service
      return [
        `Hi [Name], I noticed your work in [Industry] and thought you'd be interested in our innovative approach to [Solution].`,
        `Hello [Name], your experience at [Company] caught my attention. I'd love to share how we're helping similar organizations.`,
        `Hi [Name], I came across your profile and was impressed by your [Achievement]. Would you be open to a brief conversation?`
      ];
    } catch (error) {
      console.error('Error generating messages:', error);
      return this.generateFallbackMessage(request as any).suggestions;
    }
  }

  async optimizeTiming(_campaignData: any): Promise<string[]> {
    try {
      // In a real implementation, this would call the AI service
      return [
        'Tuesday-Thursday, 9-11 AM shows highest engagement',
        'Follow up 3-5 days after initial connection',
        'Send reminder messages on weekdays only',
        'Avoid sending during holidays and weekends'
      ];
    } catch (error) {
      console.error('Error optimizing timing:', error);
      return ['Weekdays 9-11 AM', 'Follow up after 3 days', 'Avoid weekends'];
    }
  }
}

export const aiService = new AIService();
export default aiService;
