import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { ArrowLeft, Edit3, Save, X, Users, MessageCircle, Calendar, Target, Play, Pause } from 'lucide-react';
import { apiService } from '../services/api';
import type { Campaign } from '../types/api';

interface CampaignDetailsProps {
  campaignId: string;
  onBack: () => void;
  startInEditMode?: boolean;
}

export const CampaignDetails: React.FC<CampaignDetailsProps> = ({ campaignId, onBack, startInEditMode = false }) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isEditing, setIsEditing] = useState(startInEditMode);
  const [editData, setEditData] = useState<Partial<Campaign>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [stats] = useState({
    total_prospects: 245,
    messages_sent: 189,
    connections_made: 67,
    response_rate: 23
  });

  useEffect(() => {
    loadCampaign();
  }, [campaignId]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      const data = await apiService.getCampaign(campaignId);
      setCampaign(data);
      setEditData(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...campaign });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({ ...campaign });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      
      const updatePayload = {
        name: editData.name,
        description: editData.description,
        status: editData.status
      };
      
      const updatedCampaign = await apiService.updateCampaign(campaignId, updatePayload);
      setCampaign(updatedCampaign);
      setIsEditing(false);
      
      // Show success notification
      showNotification(`Campaign "${updatedCampaign.name}" updated successfully!`, 'success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async () => {
    if (!campaign) return;
    
    try {
      setSaving(true);
      setError('');
      
      const newStatus = campaign.status === 'active' ? 'paused' : 'active';
      const updatedCampaign = await apiService.updateCampaign(campaignId, { status: newStatus });
      setCampaign(updatedCampaign);
      
      showNotification(`Campaign ${newStatus === 'active' ? 'activated' : 'paused'} successfully!`, 'info');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update campaign status');
    } finally {
      setSaving(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-blue-500';
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-md shadow-lg z-50 transition-opacity duration-300`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading campaign details...</div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-600">{error}</div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-gray-600">Campaign not found</div>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <Badge className={getStatusColor(campaign.status)}>
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </Badge>
              <span className="text-sm text-gray-500">
                Created {new Date(campaign.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} size="sm" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={handleStatusToggle} 
                variant="outline" 
                size="sm"
                disabled={saving}
              >
                {campaign.status === 'active' ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Activate
                  </>
                )}
              </Button>
              <Button onClick={handleEdit} size="sm">
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Campaign
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Prospects</p>
                <p className="text-2xl font-bold">{stats.total_prospects}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Messages Sent</p>
                <p className="text-2xl font-bold">{stats.messages_sent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Connections</p>
                <p className="text-2xl font-bold">{stats.connections_made}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Response Rate</p>
                <p className="text-2xl font-bold">{stats.response_rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Campaign Name</label>
              {isEditing ? (
                <Input
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{campaign.name}</p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              {isEditing ? (
                <Textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="mt-1"
                  rows={3}
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{campaign.description || 'No description provided'}</p>
              )}
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              {isEditing ? (
                <select
                  value={editData.status || ''}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              ) : (
                <Badge className={`mt-1 ${getStatusColor(campaign.status)}`}>
                  {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Target Audience */}
        <Card>
          <CardHeader>
            <CardTitle>Target Audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Industries</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {campaign.intake_json?.target_audience?.industries?.map((industry: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {industry}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Job Titles</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {campaign.intake_json?.target_audience?.job_titles?.map((title: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {title}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Company Sizes</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {campaign.intake_json?.target_audience?.company_sizes?.map((size: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {size}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Locations</label>
              <div className="mt-1 flex flex-wrap gap-1">
                {campaign.intake_json?.target_audience?.locations?.map((location: string, index: number) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {location}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outreach Strategy */}
        <Card>
          <CardHeader>
            <CardTitle>Outreach Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Preferred Channels</label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {campaign.intake_json?.outreach_strategy?.preferred_channels?.map((channel: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {channel}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Message Tone</label>
                <p className="mt-1 text-sm text-gray-900 capitalize">
                  {campaign.intake_json?.outreach_strategy?.message_tone}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Call to Action</label>
                <p className="mt-1 text-sm text-gray-900">
                  {campaign.intake_json?.outreach_strategy?.call_to_action}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Value Proposition */}
        <Card>
          <CardHeader>
            <CardTitle>Value Proposition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Pain Points</label>
                <div className="mt-1 space-y-1">
                  {campaign.intake_json?.value_proposition?.pain_points?.map((point: string, index: number) => (
                    <p key={index} className="text-sm text-gray-900">• {point}</p>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Solutions</label>
                <div className="mt-1 space-y-1">
                  {campaign.intake_json?.value_proposition?.solutions?.map((solution: string, index: number) => (
                    <p key={index} className="text-sm text-gray-900">• {solution}</p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals & Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Goals & Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Primary Goal</label>
              <p className="mt-1 text-sm text-gray-900">
                {campaign.intake_json?.goals_metrics?.primary_goal}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Target Response Rate</label>
              <p className="mt-1 text-sm text-gray-900">
                {campaign.intake_json?.goals_metrics?.target_response_rate}%
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Target Meetings per Week</label>
              <p className="mt-1 text-sm text-gray-900">
                {campaign.intake_json?.goals_metrics?.target_meetings_per_week}
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700">Success Metrics</label>
              <div className="mt-1 space-y-1">
                {campaign.intake_json?.goals_metrics?.success_metrics?.map((metric: string, index: number) => (
                  <p key={index} className="text-sm text-gray-900">• {metric}</p>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
