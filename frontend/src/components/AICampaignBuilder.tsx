import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Wand2, 
  Users, 
  MessageSquare, 
  Target,
  Clock,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  BarChart3
} from 'lucide-react';
import { aiService } from '../services/aiService';

interface CampaignData {
  campaignName: string;
  goal: string;
  targetAudience: {
    industries: string[];
    jobTitles: string[];
    locations: string[];
    companySize: string[];
  };
  messaging: {
    connectionMessage: string;
    firstMessage: string;
    followUpMessages: string[];
  };
  timing: {
    sendTime: string;
    followUpDelays: number[];
  };
  aiOptimizations: {
    messageOptimization: boolean;
    timingOptimization: boolean;
    audienceRefinement: boolean;
  };
}

interface AICampaignBuilderProps {
  onCampaignCreated?: (campaign: CampaignData) => void;
  className?: string;
}

export const AICampaignBuilder: React.FC<AICampaignBuilderProps> = ({
  onCampaignCreated,
  className = ''
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    campaignName: '',
    goal: '',
    targetAudience: {
      industries: [],
      jobTitles: [],
      locations: [],
      companySize: []
    },
    messaging: {
      connectionMessage: '',
      firstMessage: '',
      followUpMessages: []
    },
    timing: {
      sendTime: '09:00',
      followUpDelays: [3, 7, 14]
    },
    aiOptimizations: {
      messageOptimization: true,
      timingOptimization: true,
      audienceRefinement: true
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { id: 1, title: 'Campaign Setup', description: 'Define your campaign goals and strategy' },
    { id: 2, title: 'Target Audience', description: 'AI-powered audience targeting and refinement' },
    { id: 3, title: 'Message Creation', description: 'Craft compelling messages with AI assistance' },
    { id: 4, title: 'Timing & Sequence', description: 'Optimize timing for maximum engagement' },
    { id: 5, title: 'AI Optimization', description: 'Apply AI enhancements and review' },
    { id: 6, title: 'Review & Launch', description: 'Final review and campaign launch' }
  ];

  const generateAISuggestions = async (step: number) => {
    setLoading(true);
    setError(null);
    
    try {
      let suggestions;
      
      switch (step) {
        case 1:
          suggestions = await aiService.generateCampaignGoals(campaignData.campaignName);
          break;
        case 2:
          suggestions = await aiService.refineTargetAudience(campaignData.targetAudience);
          break;
        case 3:
          suggestions = await aiService.generateMessages({
            goal: campaignData.goal,
            audience: campaignData.targetAudience
          });
          break;
        case 4:
          suggestions = await aiService.optimizeTiming(campaignData);
          break;
        default:
          suggestions = { recommendations: ['No suggestions available for this step'] };
      }
      
      setAiSuggestions(suggestions);
    } catch (err) {
      setError('Failed to generate AI suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateCampaignData = (section: string, field: string, value: any) => {
    setCampaignData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof CampaignData],
        [field]: value
      }
    }));
  };

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      setAiSuggestions(null);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setAiSuggestions(null);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="campaignName">Campaign Name</Label>
              <Input
                id="campaignName"
                value={campaignData.campaignName}
                onChange={(e) => setCampaignData(prev => ({ ...prev, campaignName: e.target.value }))}
                placeholder="e.g., Q1 Lead Generation Campaign"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="goal">Campaign Goal</Label>
              <Textarea
                id="goal"
                value={campaignData.goal}
                onChange={(e) => setCampaignData(prev => ({ ...prev, goal: e.target.value }))}
                placeholder="Describe your campaign objectives..."
                className="mt-1 min-h-[100px]"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => generateAISuggestions(1)}
                disabled={loading || !campaignData.campaignName}
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                Get AI Goal Suggestions
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Industries</Label>
                <Input
                  placeholder="e.g., Technology, Healthcare"
                  onChange={(e) => updateCampaignData('targetAudience', 'industries', e.target.value.split(',').map(s => s.trim()))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Job Titles</Label>
                <Input
                  placeholder="e.g., CEO, Marketing Director"
                  onChange={(e) => updateCampaignData('targetAudience', 'jobTitles', e.target.value.split(',').map(s => s.trim()))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Locations</Label>
                <Input
                  placeholder="e.g., United States, United Kingdom"
                  onChange={(e) => updateCampaignData('targetAudience', 'locations', e.target.value.split(',').map(s => s.trim()))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Company Size</Label>
                <select
                  className="w-full p-2 border rounded-md mt-1"
                  onChange={(e) => updateCampaignData('targetAudience', 'companySize', [e.target.value])}
                >
                  <option value="">Select company size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501+">501+ employees</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => generateAISuggestions(2)}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                Refine with AI
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <Label>Connection Request Message</Label>
              <Textarea
                value={campaignData.messaging.connectionMessage}
                onChange={(e) => updateCampaignData('messaging', 'connectionMessage', e.target.value)}
                placeholder="Your connection request message..."
                className="mt-1 min-h-[80px]"
              />
            </div>
            
            <div>
              <Label>First Message</Label>
              <Textarea
                value={campaignData.messaging.firstMessage}
                onChange={(e) => updateCampaignData('messaging', 'firstMessage', e.target.value)}
                placeholder="Your first message after connection..."
                className="mt-1 min-h-[80px]"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => generateAISuggestions(3)}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Generate AI Messages
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <Label>Preferred Send Time</Label>
              <Input
                type="time"
                value={campaignData.timing.sendTime}
                onChange={(e) => updateCampaignData('timing', 'sendTime', e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Follow-up Delays (days)</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {campaignData.timing.followUpDelays.map((delay, index) => (
                  <Input
                    key={index}
                    type="number"
                    value={delay}
                    onChange={(e) => {
                      const newDelays = [...campaignData.timing.followUpDelays];
                      newDelays[index] = parseInt(e.target.value) || 0;
                      updateCampaignData('timing', 'followUpDelays', newDelays);
                    }}
                    placeholder={`Follow-up ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => generateAISuggestions(4)}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Optimize Timing
              </Button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium">Message Optimization</h4>
                    <p className="text-sm text-gray-600">AI-powered message enhancement</p>
                  </div>
                </div>
                <Badge className={campaignData.aiOptimizations.messageOptimization ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {campaignData.aiOptimizations.messageOptimization ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <div>
                    <h4 className="font-medium">Timing Optimization</h4>
                    <p className="text-sm text-gray-600">Optimal send times based on data</p>
                  </div>
                </div>
                <Badge className={campaignData.aiOptimizations.timingOptimization ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {campaignData.aiOptimizations.timingOptimization ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-orange-600" />
                  <div>
                    <h4 className="font-medium">Audience Refinement</h4>
                    <p className="text-sm text-gray-600">AI-enhanced targeting precision</p>
                  </div>
                </div>
                <Badge className={campaignData.aiOptimizations.audienceRefinement ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {campaignData.aiOptimizations.audienceRefinement ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-800">Campaign Ready to Launch!</h3>
              </div>
              <p className="text-green-700">
                Your AI-optimized campaign is configured and ready for deployment.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Campaign Name:</span>
                  <p className="text-gray-600">{campaignData.campaignName}</p>
                </div>
                <div>
                  <span className="font-medium">Target Industries:</span>
                  <p className="text-gray-600">{campaignData.targetAudience.industries.join(', ') || 'Not specified'}</p>
                </div>
                <div>
                  <span className="font-medium">Send Time:</span>
                  <p className="text-gray-600">{campaignData.timing.sendTime}</p>
                </div>
                <div>
                  <span className="font-medium">AI Optimizations:</span>
                  <p className="text-gray-600">
                    {Object.values(campaignData.aiOptimizations).filter(Boolean).length} enabled
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            AI Campaign Builder
          </CardTitle>
          <CardDescription>
            Build high-converting LinkedIn campaigns with AI assistance at every step
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                    ${currentStep === step.id 
                      ? 'bg-blue-600 text-white' 
                      : currentStep > step.id 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }
                  `}>
                    {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`
                      w-12 h-0.5 mx-2
                      ${currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'}
                    `} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <h3 className="font-semibold">{steps[currentStep - 1].title}</h3>
              <p className="text-sm text-gray-600">{steps[currentStep - 1].description}</p>
            </div>
          </div>

          {error && (
            <Alert className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {renderStepContent()}
            </div>
            
            {/* AI Suggestions Panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    AI Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Generating suggestions...
                    </div>
                  ) : aiSuggestions ? (
                    <div className="space-y-2">
                      {aiSuggestions.recommendations?.map((suggestion: string, index: number) => (
                        <div key={index} className="p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Click "Get AI Suggestions" to receive personalized recommendations for this step.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <Button 
              variant="outline" 
              onClick={handlePrevStep}
              disabled={currentStep === 1}
            >
              Previous
            </Button>
            
            <div className="flex gap-2">
              {currentStep === steps.length ? (
                <Button 
                  onClick={() => onCampaignCreated?.(campaignData)}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Launch Campaign
                </Button>
              ) : (
                <Button 
                  onClick={handleNextStep}
                  className="flex items-center gap-2"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AICampaignBuilder;
