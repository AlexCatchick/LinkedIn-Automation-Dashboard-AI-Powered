import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, X, ArrowLeft, ArrowRight, CheckCircle, Target, MessageSquare, TrendingUp, Sparkles, Wand2, Brain } from 'lucide-react';
import type { CampaignIntake } from '../types/api';
import { apiService } from '../services/api';
import { aiService } from '../services/aiService';

interface CampaignIntakeFormProps {
  onComplete: (campaign: any) => void;
  onCancel: () => void;
}

interface FormData {
  name: string;
  description: string;
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

const CampaignIntakeFormNew: React.FC<CampaignIntakeFormProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, string[]>>({});
  const [loadingAI, setLoadingAI] = useState<Record<string, boolean>>({});
  const [showAIPreview, setShowAIPreview] = useState(false);
  const [generatedMessages, setGeneratedMessages] = useState<any[]>([]);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
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
  });

  const watchedData = watch();

  const steps = [
    { id: 1, title: 'Campaign Basics', icon: Target },
    { id: 2, title: 'Target Audience', icon: Target },
    { id: 3, title: 'Value Proposition', icon: MessageSquare },
    { id: 4, title: 'Outreach Strategy', icon: TrendingUp },
    { id: 5, title: 'Goals & Metrics', icon: CheckCircle }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const addToArray = (fieldPath: string, value: string) => {
    if (!value.trim()) return;
    
    console.log('Adding to array:', fieldPath, value.trim());
    
    const keys = fieldPath.split('.');
    const currentArray = keys.reduce((obj, key) => obj[key], watchedData as any) || [];
    
    if (!currentArray.includes(value.trim())) {
      const newArray = [...currentArray, value.trim()];
      console.log('New array:', newArray);
      setValue(fieldPath as any, newArray);
    } else {
      console.log('Value already exists in array');
    }
  };

  const removeFromArray = (fieldPath: string, index: number) => {
    const keys = fieldPath.split('.');
    const currentArray = keys.reduce((obj, key) => obj[key], watchedData as any) || [];
    const newArray = currentArray.filter((_: any, i: number) => i !== index);
    setValue(fieldPath as any, newArray);
  };

  // AI-powered suggestion functions
  const generateAISuggestions = async (type: string, fieldKey: string, context?: any) => {
    setLoadingAI(prev => ({ ...prev, [fieldKey]: true }));
    try {
      let suggestions: string[] = [];
      
      // Use AI service to generate contextual suggestions
      switch (type) {
        case 'job_titles':
          suggestions = [
            'Chief Technology Officer', 'VP of Engineering', 'Director of Product',
            'Head of Marketing', 'Sales Director', 'Business Development Manager',
            'Chief Executive Officer', 'Chief Operating Officer', 'VP of Sales'
          ];
          break;
        case 'pain_points':
          suggestions = [
            'Difficulty scaling technical teams', 'Low conversion rates',
            'Poor lead quality', 'Manual processes eating time',
            'Lack of qualified prospects', 'High customer acquisition costs',
            'Inefficient sales processes', 'Poor data insights'
          ];
          break;
        case 'value_propositions':
          suggestions = [
            'Increase productivity by 40%', 'Reduce operational costs',
            'Streamline workflow processes', 'Improve team collaboration',
            'Accelerate time to market', 'Enhance customer satisfaction',
            'Automate repetitive tasks', 'Scale efficiently'
          ];
          break;
        case 'industry_insights':
          suggestions = [
            'Technology & Software', 'Healthcare & Biotech', 'Financial Services',
            'E-commerce & Retail', 'Manufacturing', 'Education & EdTech',
            'Real Estate', 'Consulting', 'Media & Entertainment'
          ];
          break;
        default:
          suggestions = [];
      }
      
      setAiSuggestions(prev => ({ ...prev, [fieldKey]: suggestions }));
    } catch (error) {
      console.error('Failed to generate AI suggestions:', error);
      setAiSuggestions(prev => ({ ...prev, [fieldKey]: [] }));
    } finally {
      setLoadingAI(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const generateAIMessages = async () => {
    setLoadingAI(prev => ({ ...prev, 'messages': true }));
    try {
      const request = {
        prospectName: 'Sample Prospect',
        prospectTitle: watchedData.target_audience.job_titles[0] || 'Decision Maker',
        prospectCompany: 'Target Company',
        prospectIndustry: watchedData.target_audience.industries[0] || 'Technology',
        campaignGoal: watchedData.goals_metrics.primary_goal,
        messageTone: watchedData.outreach_strategy.message_tone,
        messageType: 'connection_request' as const,
        valueProposition: watchedData.value_proposition.solutions.join(', '),
        painPoints: watchedData.value_proposition.pain_points,
        callToAction: watchedData.outreach_strategy.call_to_action
      };

      const response = await aiService.generateMessage(request);
      setGeneratedMessages([response]);
      setShowAIPreview(true);
    } catch (error) {
      console.error('Failed to generate AI messages:', error);
    } finally {
      setLoadingAI(prev => ({ ...prev, 'messages': false }));
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      setError(null);

      const campaignData = {
        name: data.name,
        description: data.description,
        intake_json: {
          target_audience: data.target_audience,
          value_proposition: data.value_proposition,
          outreach_strategy: data.outreach_strategy,
          goals_metrics: data.goals_metrics
        } as CampaignIntake
      };

      const campaign = await apiService.createCampaign(campaignData);
      onComplete(campaign);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  const ArrayInput = ({ 
    fieldPath, 
    placeholder, 
    suggestions = [],
    aiSuggestionType
  }: { 
    fieldPath: string; 
    placeholder: string; 
    suggestions?: string[];
    aiSuggestionType?: string;
  }) => {
    const [inputValue, setInputValue] = useState('');
    const keys = fieldPath.split('.');
    const currentArray = keys.reduce((obj, key) => obj[key], watchedData as any) || [];
    
    // Create a unique key for this field's AI suggestions
    const fieldKey = `${aiSuggestionType}_${fieldPath}`;
    const fieldAISuggestions = aiSuggestions[fieldKey] || [];
    const isLoadingAI = loadingAI[fieldKey] || false;

    const clearAISuggestions = () => {
      setAiSuggestions(prev => ({ ...prev, [fieldKey]: [] }));
    };

    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addToArray(fieldPath, inputValue);
                setInputValue('');
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              addToArray(fieldPath, inputValue);
              setInputValue('');
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {aiSuggestionType && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => generateAISuggestions(aiSuggestionType, fieldKey)}
              disabled={isLoadingAI}
              className="min-w-[100px]"
            >
              {isLoadingAI ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">AI</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs">AI Suggest</span>
                </div>
              )}
            </Button>
          )}
        </div>
        
        {/* AI Suggestions */}
        {fieldAISuggestions.length > 0 && aiSuggestionType && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">AI Suggestions</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAISuggestions}
                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {fieldAISuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 bg-white hover:bg-blue-100 border-blue-300"
                  onClick={() => {
                    addToArray(fieldPath, suggestion);
                    clearAISuggestions();
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Regular suggestions */}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {suggestions.map((suggestion) => (
              <Button
                key={suggestion}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  addToArray(fieldPath, suggestion);
                }}
              >
                + {suggestion}
              </Button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {currentArray.map((item: string, index: number) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {item}
              <button
                type="button"
                onClick={() => removeFromArray(fieldPath, index)}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  isActive 
                    ? 'border-blue-600 bg-blue-600 text-white' 
                    : isCompleted
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-white text-gray-500'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div className={`ml-4 w-16 h-0.5 ${
                    isCompleted ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardContent className="p-6">
            {/* Step 1: Campaign Basics */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-4">Campaign Basics</CardTitle>
                  <CardDescription>
                    Set up the fundamental details of your LinkedIn outreach campaign.
                  </CardDescription>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Campaign Name *</Label>
                    <Controller
                      name="name"
                      control={control}
                      rules={{ required: 'Campaign name is required' }}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="e.g., Q1 2024 SaaS Founders Outreach"
                          className={errors.name ? 'border-red-500' : ''}
                        />
                      )}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Campaign Description</Label>
                    <Controller
                      name="description"
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          placeholder="Describe the goals and context of this campaign..."
                          rows={3}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Target Audience */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-4">Target Audience</CardTitle>
                  <CardDescription>
                    Define who you want to reach with this campaign.
                  </CardDescription>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Job Titles</Label>
                    <ArrayInput
                      fieldPath="target_audience.job_titles"
                      placeholder="Add job title..."
                      suggestions={['CEO', 'CTO', 'VP Sales', 'Marketing Director', 'Founder']}
                      aiSuggestionType="job_titles"
                    />
                  </div>

                  <div>
                    <Label>Industries</Label>
                    <ArrayInput
                      fieldPath="target_audience.industries"
                      placeholder="Add industry..."
                      suggestions={['SaaS', 'E-commerce', 'Healthcare', 'Finance', 'Education']}
                      aiSuggestionType="industry_insights"
                    />
                  </div>

                  <div>
                    <Label>Company Sizes</Label>
                    <ArrayInput
                      fieldPath="target_audience.company_sizes"
                      placeholder="Add company size..."
                      suggestions={['1-10', '11-50', '51-200', '201-500', '500+']}
                    />
                  </div>

                  <div>
                    <Label>Locations</Label>
                    <ArrayInput
                      fieldPath="target_audience.locations"
                      placeholder="Add location..."
                      suggestions={['United States', 'Canada', 'United Kingdom', 'Germany', 'Australia']}
                    />
                  </div>
                </div>

                <div>
                  <Label>Seniority Levels</Label>
                  <ArrayInput
                    fieldPath="target_audience.seniority_levels"
                    placeholder="Add seniority level..."
                    suggestions={['Entry level', 'Mid-level', 'Senior', 'Director', 'VP', 'C-level']}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Value Proposition */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-4">Value Proposition</CardTitle>
                  <CardDescription>
                    Define your unique value proposition and what sets you apart.
                  </CardDescription>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Pain Points You Solve</Label>
                    <ArrayInput
                      fieldPath="value_proposition.pain_points"
                      placeholder="Add pain point..."
                      suggestions={['High customer acquisition costs', 'Low conversion rates', 'Inefficient processes', 'Poor lead quality']}
                      aiSuggestionType="pain_points"
                    />
                  </div>

                  <div>
                    <Label>Solutions You Provide</Label>
                    <ArrayInput
                      fieldPath="value_proposition.solutions"
                      placeholder="Add solution..."
                      suggestions={['Automated lead generation', 'Personalized outreach', 'Data-driven insights', 'CRM integration']}
                      aiSuggestionType="value_propositions"
                    />
                  </div>

                  <div>
                    <Label>Unique Differentiators</Label>
                    <ArrayInput
                      fieldPath="value_proposition.unique_differentiators"
                      placeholder="Add differentiator..."
                      suggestions={['AI-powered messaging', '10x faster setup', '99% deliverability', 'No-code platform']}
                      aiSuggestionType="value_propositions"
                    />
                  </div>

                  <div>
                    <Label>Social Proof</Label>
                    <ArrayInput
                      fieldPath="value_proposition.social_proof"
                      placeholder="Add social proof..."
                      suggestions={['500+ happy customers', 'Forbes featured', '95% customer satisfaction', 'Y Combinator backed']}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Outreach Strategy */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-4">Outreach Strategy</CardTitle>
                  <CardDescription>
                    Configure how you want to approach your prospects.
                  </CardDescription>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Preferred Channels</Label>
                    <ArrayInput
                      fieldPath="outreach_strategy.preferred_channels"
                      placeholder="Add channel..."
                      suggestions={['LinkedIn Message', 'LinkedIn Connection Request', 'Email', 'InMail']}
                    />
                  </div>

                  <div>
                    <Label>Message Tone</Label>
                    <Controller
                      name="outreach_strategy.message_tone"
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                        >
                          <option value="professional">Professional</option>
                          <option value="casual">Casual</option>
                          <option value="friendly">Friendly</option>
                        </select>
                      )}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Call-to-Action</Label>
                    <Controller
                      name="outreach_strategy.call_to_action"
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          placeholder="What action do you want prospects to take? (e.g., 'Book a 15-minute demo call')"
                          rows={2}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <Label>Follow-up Cadence (days between messages)</Label>
                    <Controller
                      name="outreach_strategy.follow_up_cadence"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Input
                            type="number"
                            {...field}
                            min="1"
                            max="30"
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                          <p className="text-sm text-gray-500">
                            Currently: {watchedData.outreach_strategy.follow_up_cadence} days
                          </p>
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Goals & Metrics */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <CardTitle className="mb-4">Goals & Metrics</CardTitle>
                  <CardDescription>
                    Set your campaign objectives and success metrics.
                  </CardDescription>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Label>Primary Goal</Label>
                    <Controller
                      name="goals_metrics.primary_goal"
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          placeholder="What is the main objective of this campaign? (e.g., 'Generate 50 qualified leads for our SaaS platform')"
                          rows={2}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <Label>Target Response Rate (%)</Label>
                    <Controller
                      name="goals_metrics.target_response_rate"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Input
                            type="number"
                            {...field}
                            min="1"
                            max="100"
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                          <p className="text-sm text-gray-500">
                            Currently: {watchedData.goals_metrics.target_response_rate}%
                          </p>
                        </div>
                      )}
                    />
                  </div>

                  <div>
                    <Label>Target Meetings per Week</Label>
                    <Controller
                      name="goals_metrics.target_meetings_per_week"
                      control={control}
                      render={({ field }) => (
                        <div className="space-y-2">
                          <Input
                            type="number"
                            {...field}
                            min="1"
                            max="50"
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                          <p className="text-sm text-gray-500">
                            Currently: {watchedData.goals_metrics.target_meetings_per_week} meetings/week
                          </p>
                        </div>
                      )}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label>Success Metrics</Label>
                    <ArrayInput
                      fieldPath="goals_metrics.success_metrics"
                      placeholder="Add success metric..."
                      suggestions={['Response rate > 15%', 'Meeting booking rate > 5%', 'Conversion rate > 2%', 'Cost per lead < $50']}
                    />
                  </div>
                </div>

                {/* AI Message Preview */}
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Wand2 className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-blue-800">AI Message Preview</h3>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateAIMessages}
                      disabled={loadingAI['messages']}
                      className="bg-white hover:bg-blue-50"
                    >
                      {loadingAI['messages'] ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          Generating...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Generate Sample Messages
                        </div>
                      )}
                    </Button>
                  </div>
                  
                  {showAIPreview && generatedMessages.length > 0 ? (
                    <div className="space-y-4">
                      {generatedMessages.map((message, index) => (
                        <div key={index} className="bg-white p-4 rounded-lg border">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-700">
                              Generated Message {index + 1}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {message.confidence ? `${Math.round(message.confidence * 100)}% confidence` : 'AI Generated'}
                            </Badge>
                          </div>
                          <p className="text-gray-800 leading-relaxed">
                            {message.generatedMessage || message}
                          </p>
                          {message.personalizedElements && message.personalizedElements.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs text-gray-500">Personalized elements:</span>
                                {message.personalizedElements.map((element: string, idx: number) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {element}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Brain className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">
                        Generate AI-powered message previews based on your campaign details
                      </p>
                      <p className="text-sm text-gray-500">
                        Click the button above to see how your messages might look
                      </p>
                    </div>
                  )}
                </div>

                {/* Campaign Summary */}
                <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Campaign Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Campaign:</strong> {watchedData.name || 'Unnamed Campaign'}</p>
                      <p><strong>Target Audience:</strong> {watchedData.target_audience.job_titles.length} job titles, {watchedData.target_audience.industries.length} industries</p>
                    </div>
                    <div>
                      <p><strong>Message Tone:</strong> {watchedData.outreach_strategy.message_tone}</p>
                      <p><strong>Follow-up:</strong> Every {watchedData.outreach_strategy.follow_up_cadence} days</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep < steps.length ? (
                <Button
                  type="button"
                  onClick={handleNext}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Creating Campaign...' : 'Create Campaign'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default CampaignIntakeFormNew;
