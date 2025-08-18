import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Fab,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  People,
  Email,
  Campaign,
  Add,
  Visibility,
  Edit
} from '@mui/icons-material';
import type { Analytics, Campaign as CampaignType } from '../types/api';
import { apiService } from '../services/api';

interface DashboardProps {
  onCreateCampaign: () => void;
  onViewCampaign: (campaignId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onCreateCampaign, onViewCampaign }) => {
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

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography variant="h6" sx={{ textAlign: 'center', mt: 2 }}>
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'info';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const formatResponseRate = (rate: number) => `${(rate * 100).toFixed(1)}%`;

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          LinkedIn Automation Dashboard
        </Typography>
        <Tooltip title="Create New Campaign">
          <Fab color="primary" onClick={onCreateCampaign} sx={{ ml: 2 }}>
            <Add />
          </Fab>
        </Tooltip>
      </Box>

      {/* Key Metrics */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Campaign color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Campaigns
                  </Typography>
                  <Typography variant="h4">
                    {analytics?.campaigns_active || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <People color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Prospects
                  </Typography>
                  <Typography variant="h4">
                    {analytics?.total_prospects || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Email color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Messages Sent
                  </Typography>
                  <Typography variant="h4">
                    {analytics?.total_messages || 0}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1, minWidth: '250px' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Response Rate
                  </Typography>
                  <Typography variant="h4">
                    {formatResponseRate(analytics?.response_rate || 0)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Analytics Summary */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Campaign Analytics Summary
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: '200px' }}>
            <Typography variant="body2" color="textSecondary">
              Active Campaigns: {analytics?.campaigns_active || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Total Prospects: {analytics?.total_prospects || 0}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: '200px' }}>
            <Typography variant="body2" color="textSecondary">
              Messages Sent: {analytics?.total_messages || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Conversion Rate: {formatResponseRate(analytics?.conversion_rate || 0)}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: '200px' }}>
            <Typography variant="body2" color="textSecondary">
              Response Rate: {formatResponseRate(analytics?.response_rate || 0)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Recent Events: {analytics?.recent_activity?.length || 0}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Recent Campaigns */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recent Campaigns
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Prospects</TableCell>
                <TableCell>Messages</TableCell>
                <TableCell>Response Rate</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {campaigns.slice(0, 5).map((campaign) => {
                const performance = analytics?.performance_by_campaign.find(
                  p => p.campaign_id === campaign.id
                );
                return (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{campaign.name}</Typography>
                      {campaign.description && (
                        <Typography variant="body2" color="textSecondary">
                          {campaign.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={campaign.status}
                        color={getStatusColor(campaign.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{performance?.prospects_count || 0}</TableCell>
                    <TableCell>{performance?.messages_sent || 0}</TableCell>
                    <TableCell>
                      {formatResponseRate(performance?.response_rate || 0)}
                    </TableCell>
                    <TableCell>
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        onClick={() => onViewCampaign(campaign.id)}
                        title="View Campaign"
                      >
                        <Visibility />
                      </IconButton>
                      <IconButton size="small" title="Edit Campaign">
                        <Edit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        {campaigns.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="textSecondary" gutterBottom>
              No campaigns found. Create your first campaign to get started!
            </Typography>
            <Fab
              color="primary"
              variant="extended"
              onClick={onCreateCampaign}
              sx={{ mt: 2 }}
            >
              <Add sx={{ mr: 1 }} />
              Create Campaign
            </Fab>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default Dashboard;
