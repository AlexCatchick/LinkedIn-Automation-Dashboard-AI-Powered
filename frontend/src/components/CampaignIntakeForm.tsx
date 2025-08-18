import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Alert
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import type { CampaignIntake } from '../types/api';
import { apiService } from '../services/api';

interface CampaignIntakeFormProps {
  onComplete: (campaign: any) => void;
  onCancel: () => void;
}

const CampaignIntakeForm: React.FC<CampaignIntakeFormProps> = ({ onComplete, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<{
    campaignName: string;
    campaignDescription: string;
    intake: CampaignIntake;
  }>({
    defaultValues: {
      campaignName: '',
      campaignDescription: '',
      intake: {
        target_audience: {
          job_titles: [],
          industries: [],
          company_sizes: [],
          locations: [],
          seniority_levels: []
        },
        value_proposition: {
          pain_points: [],
          solutions: [],
          unique_differentiators: [],
          social_proof: []
        },
        outreach_strategy: {
          preferred_channels: [],
          message_tone: 'professional',
          call_to_action: '',
          follow_up_cadence: 3
        },
        goals_metrics: {
          primary_goal: '',
          target_response_rate: 15,
          target_meetings_per_week: 5,
          success_metrics: []
        }
      }
    }
  });

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const campaign = await apiService.createCampaign({
        name: data.campaignName,
        description: data.campaignDescription,
        intake_json: data.intake
      });
      
      onComplete(campaign);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create New Campaign
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Campaign Basic Info */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Campaign Information
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: '250px' }}>
                <Controller
                  name="campaignName"
                  control={control}
                  rules={{ required: 'Campaign name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Campaign Name"
                      fullWidth
                      required
                      error={!!errors.campaignName}
                      helperText={errors.campaignName?.message}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: '250px' }}>
                <Controller
                  name="campaignDescription"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Campaign Description"
                      fullWidth
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Target Audience */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Target Audience
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: '250px' }}>
                <Controller
                  name="intake.target_audience.job_titles"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Job Titles (comma-separated)"
                      fullWidth
                      placeholder="CEO, CTO, VP Sales"
                      value={field.value?.join(', ') || ''}
                      onChange={(e) => {
                        const titles = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                        field.onChange(titles);
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: '250px' }}>
                <Controller
                  name="intake.target_audience.industries"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Industries (comma-separated)"
                      fullWidth
                      placeholder="Technology, Healthcare, Finance"
                      value={field.value?.join(', ') || ''}
                      onChange={(e) => {
                        const industries = e.target.value.split(',').map(i => i.trim()).filter(i => i);
                        field.onChange(industries);
                      }}
                    />
                  )}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: '250px' }}>
                <Controller
                  name="intake.target_audience.company_sizes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Company Sizes (comma-separated)"
                      fullWidth
                      placeholder="11-50 employees, 51-200 employees"
                      value={field.value?.join(', ') || ''}
                      onChange={(e) => {
                        const sizes = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                        field.onChange(sizes);
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: '250px' }}>
                <Controller
                  name="intake.target_audience.locations"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Target Locations (comma-separated)"
                      fullWidth
                      placeholder="New York, San Francisco, Remote"
                      value={field.value?.join(', ') || ''}
                      onChange={(e) => {
                        const locations = e.target.value.split(',').map(l => l.trim()).filter(l => l);
                        field.onChange(locations);
                      }}
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Value Proposition */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Value Proposition
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: '250px' }}>
                <Controller
                  name="intake.value_proposition.pain_points"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Pain Points (one per line)"
                      multiline
                      rows={4}
                      fullWidth
                      placeholder="Low conversion rates&#10;Manual processes&#10;Limited insights"
                      value={field.value?.join('\n') || ''}
                      onChange={(e) => {
                        const points = e.target.value.split('\n').filter(p => p.trim());
                        field.onChange(points);
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: '250px' }}>
                <Controller
                  name="intake.value_proposition.solutions"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Solutions (one per line)"
                      multiline
                      rows={4}
                      fullWidth
                      placeholder="Increase conversion by 300%&#10;Automate workflow&#10;Real-time analytics"
                      value={field.value?.join('\n') || ''}
                      onChange={(e) => {
                        const solutions = e.target.value.split('\n').filter(s => s.trim());
                        field.onChange(solutions);
                      }}
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Outreach Strategy */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Outreach Strategy
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: '250px' }}>
                <Controller
                  name="intake.outreach_strategy.preferred_channels"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      label="Preferred Channels (comma-separated)"
                      fullWidth
                      placeholder="LinkedIn Messages, Email, Connection Requests"
                      value={field.value?.join(', ') || ''}
                      onChange={(e) => {
                        const channels = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                        field.onChange(channels);
                      }}
                    />
                  )}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: '250px' }}>
                <Controller
                  name="intake.outreach_strategy.message_tone"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Message Tone</InputLabel>
                      <Select {...field}>
                        <MenuItem value="professional">Professional</MenuItem>
                        <MenuItem value="casual">Casual</MenuItem>
                        <MenuItem value="friendly">Friendly</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Box>
            </Box>

            <Box>
              <Controller
                name="intake.outreach_strategy.call_to_action"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Call to Action"
                    fullWidth
                    placeholder="Book a 15-minute demo call"
                  />
                )}
              />
            </Box>

            {/* Goals & Metrics */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Goals & Metrics
              </Typography>
            </Box>

            <Box>
              <Controller
                name="intake.goals_metrics.primary_goal"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Primary Goal"
                    fullWidth
                    placeholder="Generate 20 qualified leads per month"
                  />
                )}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: '250px' }}>
                <Controller
                  name="intake.goals_metrics.target_response_rate"
                  control={control}
                  render={({ field }) => (
                    <Box>
                      <Typography gutterBottom>
                        Target Response Rate: {field.value}%
                      </Typography>
                      <Slider
                        {...field}
                        min={5}
                        max={50}
                        marks
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  )}
                />
              </Box>

              <Box sx={{ flex: 1, minWidth: '250px' }}>
                <Controller
                  name="intake.goals_metrics.target_meetings_per_week"
                  control={control}
                  render={({ field }) => (
                    <Box>
                      <Typography gutterBottom>
                        Target Meetings per Week: {field.value}
                      </Typography>
                      <Slider
                        {...field}
                        min={1}
                        max={20}
                        marks
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  )}
                />
              </Box>
            </Box>

            <Box>
              <Controller
                name="intake.goals_metrics.success_metrics"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="Success Metrics (one per line)"
                    multiline
                    rows={3}
                    fullWidth
                    placeholder="Response rate > 15%&#10;Meeting booking rate > 5%&#10;Cost per lead < $50"
                    value={field.value?.join('\n') || ''}
                    onChange={(e) => {
                      const metrics = e.target.value.split('\n').filter(m => m.trim());
                      field.onChange(metrics);
                    }}
                  />
                )}
              />
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button onClick={onCancel} disabled={loading}>
                Cancel
              </Button>
              
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                size="large"
              >
                {loading ? 'Creating...' : 'Create Campaign'}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default CampaignIntakeForm;
