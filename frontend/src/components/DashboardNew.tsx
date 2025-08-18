import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, MessageSquare, TrendingUp, BarChart3, Eye, Edit } from 'lucide-react';
import type { Analytics, Campaign as CampaignType } from '../types/api';
import { apiService } from '../services/api';

interface DashboardProps {
  onCreateCampaign: () => void;
  onViewCampaign: (campaignId: string) => void;
  onEditCampaign: (campaignId: string) => void;
  onNavigateToAI?: (view: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  onCreateCampaign, 
  onViewCampaign, 
  onEditCampaign, 
  onNavigateToAI 
}) => {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [analyticsData, campaignsData] = await Promise.all([
        apiService.getAnalytics(),
        apiService.getCampaigns()
      ]);
      
      setAnalytics(analyticsData);
      setCampaigns(campaignsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'paused': return 'secondary';
      case 'completed': return 'outline';
      case 'draft': return 'destructive';
      default: return 'outline';
    }
  };

  const formatResponseRate = (rate: number) => `${(rate * 100).toFixed(1)}%`;

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">LinkedIn Automation Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor your outreach campaigns and performance</p>
        </div>
        <Button onClick={onCreateCampaign} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.campaigns_active || 0}</div>
            <p className="text-xs text-muted-foreground">
              Running campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prospects</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_prospects || 0}</div>
            <p className="text-xs text-muted-foreground">
              Prospects in database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.total_messages || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total outreach messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatResponseRate(analytics?.response_rate || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Average response rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Performance Overview</CardTitle>
          <CardDescription>
            Key metrics and insights from your campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-medium">Campaign Performance</p>
              <p className="text-sm text-muted-foreground">
                Active: {analytics?.campaigns_active || 0}
              </p>
              <p className="text-sm text-muted-foreground">
                Total Prospects: {analytics?.total_prospects || 0}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Messaging Stats</p>
              <p className="text-sm text-muted-foreground">
                Messages Sent: {analytics?.total_messages || 0}
              </p>
              <p className="text-sm text-muted-foreground">
                Response Rate: {formatResponseRate(analytics?.response_rate || 0)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Conversion Metrics</p>
              <p className="text-sm text-muted-foreground">
                Conversion Rate: {formatResponseRate(analytics?.conversion_rate || 0)}
              </p>
              <p className="text-sm text-muted-foreground">
                Recent Activity: {analytics?.recent_activity?.length || 0} events
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Features Quick Access */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            AI-Powered Features
          </CardTitle>
          <CardDescription>
            Enhance your LinkedIn automation with artificial intelligence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium">AI Message Optimizer</h4>
                  <p className="text-xs text-muted-foreground">Optimize messages with AI</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Enhance your LinkedIn messages with AI-powered optimization and A/B testing variations.
              </p>
              <Button variant="outline" size="sm" className="w-full"
                      onClick={() => onNavigateToAI?.('message-optimizer')}>
                Try AI Optimizer
              </Button>
            </div>

            <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium">Smart Sequences</h4>
                  <p className="text-xs text-muted-foreground">AI-generated follow-ups</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Create intelligent follow-up sequences with AI-generated messaging tailored to your audience.
              </p>
              <Button variant="outline" size="sm" className="w-full"
                      onClick={() => onNavigateToAI?.('smart-sequences')}>
                Create Sequence
              </Button>
            </div>

            <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium">AI Analytics</h4>
                  <p className="text-xs text-muted-foreground">Intelligent insights</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Get actionable insights powered by AI analysis of your campaign performance and trends.
              </p>
              <Button variant="outline" size="sm" className="w-full"
                      onClick={() => onNavigateToAI?.('analytics')}>
                View Analytics
              </Button>
            </div>

            <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer group">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-medium">AI Campaign Builder</h4>
                  <p className="text-xs text-muted-foreground">End-to-end AI assistance</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Build high-converting campaigns with AI guidance through every step of the process.
              </p>
              <Button variant="outline" size="sm" className="w-full"
                      onClick={() => onNavigateToAI?.('ai-campaign-builder')}>
                Build Campaign
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
          <CardDescription>
            Your latest LinkedIn automation campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first campaign to start automating your LinkedIn outreach
              </p>
              <Button onClick={onCreateCampaign} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.slice(0, 5).map((campaign) => {
                const performance = analytics?.performance_by_campaign?.find(
                  p => p.campaign_id === campaign.id
                );
                return (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                        <Badge variant={getStatusVariant(campaign.status)}>
                          {campaign.status}
                        </Badge>
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-gray-600 mb-2">{campaign.description}</p>
                      )}
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <span>Prospects: {performance?.prospects_count || 0}</span>
                        <span>Messages: {performance?.messages_sent || 0}</span>
                        <span>Response Rate: {formatResponseRate(performance?.response_rate || 0)}</span>
                        <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewCampaign(campaign.id)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditCampaign(campaign.id)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
