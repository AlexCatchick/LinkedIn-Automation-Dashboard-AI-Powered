import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Wand2, 
  Plus, 
  Clock, 
  RefreshCw,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { aiService } from '../services/aiService';

interface SequenceStep {
  id: string;
  delay: number;
  delayUnit: 'hours' | 'days' | 'weeks';
  messageType: 'connection_request' | 'first_message' | 'follow_up' | 'thank_you';
  message: string;
  aiGenerated: boolean;
  tone: 'professional' | 'casual' | 'friendly';
}

interface AISmartSequencesProps {
  onSequenceCreated?: (sequence: any) => void;
  className?: string;
}

export const AISmartSequences: React.FC<AISmartSequencesProps> = ({
  onSequenceCreated,
  className = ''
}) => {
  const [sequenceName, setSequenceName] = useState('');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingStep, setGeneratingStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaultSequenceTemplates = [
    {
      name: 'Professional Outreach',
      goal: 'Build professional connections',
      steps: [
        { delay: 0, delayUnit: 'days', messageType: 'connection_request', tone: 'professional' },
        { delay: 3, delayUnit: 'days', messageType: 'first_message', tone: 'professional' },
        { delay: 7, delayUnit: 'days', messageType: 'follow_up', tone: 'professional' },
        { delay: 14, delayUnit: 'days', messageType: 'follow_up', tone: 'friendly' }
      ]
    },
    {
      name: 'Sales Outreach',
      goal: 'Generate qualified leads',
      steps: [
        { delay: 0, delayUnit: 'days', messageType: 'connection_request', tone: 'professional' },
        { delay: 2, delayUnit: 'days', messageType: 'first_message', tone: 'friendly' },
        { delay: 5, delayUnit: 'days', messageType: 'follow_up', tone: 'professional' },
        { delay: 10, delayUnit: 'days', messageType: 'follow_up', tone: 'casual' },
        { delay: 21, delayUnit: 'days', messageType: 'follow_up', tone: 'professional' }
      ]
    },
    {
      name: 'Networking Sequence',
      goal: 'Expand professional network',
      steps: [
        { delay: 0, delayUnit: 'days', messageType: 'connection_request', tone: 'friendly' },
        { delay: 4, delayUnit: 'days', messageType: 'first_message', tone: 'friendly' },
        { delay: 10, delayUnit: 'days', messageType: 'follow_up', tone: 'casual' }
      ]
    },
    {
      name: 'Content Engagement',
      goal: 'Engage with content creators',
      steps: [
        { delay: 0, delayUnit: 'days', messageType: 'connection_request', tone: 'friendly' },
        { delay: 1, delayUnit: 'days', messageType: 'first_message', tone: 'casual' },
        { delay: 7, delayUnit: 'days', messageType: 'follow_up', tone: 'friendly' }
      ]
    },
    {
      name: 'Talent Recruitment',
      goal: 'Source and engage potential candidates',
      steps: [
        { delay: 0, delayUnit: 'days', messageType: 'connection_request', tone: 'professional' },
        { delay: 2, delayUnit: 'days', messageType: 'first_message', tone: 'professional' },
        { delay: 7, delayUnit: 'days', messageType: 'follow_up', tone: 'friendly' },
        { delay: 14, delayUnit: 'days', messageType: 'follow_up', tone: 'professional' }
      ]
    },
    {
      name: 'Partnership Outreach',
      goal: 'Establish business partnerships',
      steps: [
        { delay: 0, delayUnit: 'days', messageType: 'connection_request', tone: 'professional' },
        { delay: 3, delayUnit: 'days', messageType: 'first_message', tone: 'professional' },
        { delay: 8, delayUnit: 'days', messageType: 'follow_up', tone: 'professional' },
        { delay: 16, delayUnit: 'days', messageType: 'follow_up', tone: 'friendly' }
      ]
    }
  ];

  const generateAISequence = async (template: any) => {
    setLoading(true);
    setError(null);
    setSequenceName(template.name);
    setCampaignGoal(template.goal);

    try {
      const generatedSteps: SequenceStep[] = [];

      for (let i = 0; i < template.steps.length; i++) {
        const stepTemplate = template.steps[i];
        setGeneratingStep(`Step ${i + 1}`);

        const request = {
          prospectName: 'there',
          prospectTitle: targetAudience || 'professional',
          prospectCompany: 'their company',
          prospectIndustry: 'their industry',
          campaignGoal: template.goal,
          messageTone: stepTemplate.tone,
          messageType: stepTemplate.messageType,
          valueProposition: 'improve efficiency and drive growth',
          callToAction: i === template.steps.length - 1 ? 'Would you be interested in a brief call?' : ''
        };

        const result = await aiService.generateMessage(request);
        
        generatedSteps.push({
          id: `step-${i + 1}`,
          delay: stepTemplate.delay,
          delayUnit: stepTemplate.delayUnit as 'hours' | 'days' | 'weeks',
          messageType: stepTemplate.messageType as any,
          message: result.generatedMessage,
          aiGenerated: true,
          tone: stepTemplate.tone as any
        });

        // Add a small delay between generations to simulate real AI processing
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      setSteps(generatedSteps);
      setGeneratingStep(null);
    } catch (error) {
      console.error('Failed to generate AI sequence:', error);
      setError('Failed to generate AI sequence. Please try again.');
      setGeneratingStep(null);
    } finally {
      setLoading(false);
    }
  };

  const addCustomStep = () => {
    const newStep: SequenceStep = {
      id: `step-${steps.length + 1}`,
      delay: steps.length === 0 ? 0 : 3,
      delayUnit: 'days',
      messageType: 'follow_up',
      message: '',
      aiGenerated: false,
      tone: 'professional'
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (stepId: string, field: keyof SequenceStep, value: any) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, [field]: value } : step
    ));
  };

  const generateMessageForStep = async (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return;

    setGeneratingStep(stepId);
    try {
      const request = {
        prospectName: 'there',
        prospectTitle: targetAudience || 'professional',
        prospectCompany: 'their company',
        prospectIndustry: 'their industry',
        campaignGoal: campaignGoal || 'build connections',
        messageTone: step.tone,
        messageType: step.messageType,
        valueProposition: 'improve efficiency and drive growth'
      };

      const result = await aiService.generateMessage(request);
      updateStep(stepId, 'message', result.generatedMessage);
      updateStep(stepId, 'aiGenerated', true);
    } catch (error) {
      console.error('Failed to generate message:', error);
      setError('Failed to generate message for this step.');
    } finally {
      setGeneratingStep(null);
    }
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId));
  };

  const saveSequence = () => {
    if (!sequenceName.trim() || steps.length === 0) {
      setError('Please provide a sequence name and at least one step.');
      return;
    }

    const sequence = {
      name: sequenceName,
      goal: campaignGoal,
      targetAudience,
      steps,
      aiPowered: steps.some(step => step.aiGenerated),
      createdAt: new Date().toISOString()
    };

    onSequenceCreated?.(sequence);
  };

  const getDelayText = (delay: number, unit: string) => {
    if (delay === 0) return 'Immediate';
    return `${delay} ${unit}${delay > 1 ? '' : ''} later`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-purple-600" />
          <CardTitle>AI Smart Sequences</CardTitle>
        </div>
        <CardDescription>
          Create intelligent follow-up sequences with AI-generated messaging
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Sequence Setup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="sequenceName">Sequence Name</Label>
            <Input
              id="sequenceName"
              value={sequenceName}
              onChange={(e) => setSequenceName(e.target.value)}
              placeholder="e.g., Professional Outreach Sequence"
            />
          </div>
          <div>
            <Label htmlFor="campaignGoal">Campaign Goal</Label>
            <Input
              id="campaignGoal"
              value={campaignGoal}
              onChange={(e) => setCampaignGoal(e.target.value)}
              placeholder="e.g., Generate qualified leads"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="targetAudience">Target Audience</Label>
          <Input
            id="targetAudience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="e.g., CTOs, Marketing Directors"
          />
        </div>

        {/* AI Template Generator */}
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            Quick Start with AI Templates
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {defaultSequenceTemplates.map((template, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => generateAISequence(template)}
                disabled={loading}
                className="text-left h-auto p-3"
              >
                <div>
                  <div className="font-medium text-sm">{template.name}</div>
                  <div className="text-xs text-muted-foreground">{template.steps.length} steps</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Sequence Steps */}
        {steps.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Sequence Steps</h4>
              <Badge variant="outline">{steps.length} steps</Badge>
            </div>

            {steps.map((step, index) => (
              <Card key={step.id} className="relative">
                <CardContent className="pt-4">
                  {generatingStep === step.id && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                      <div className="flex items-center gap-2 text-blue-600">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating AI message...
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline">Step {index + 1}</Badge>
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {getDelayText(step.delay, step.delayUnit)}
                    </span>
                    {step.aiGenerated && (
                      <Badge variant="secondary" className="text-xs">
                        <Wand2 className="h-3 w-3 mr-1" />
                        AI Generated
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <Label className="text-xs">Delay</Label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          value={step.delay}
                          onChange={(e) => updateStep(step.id, 'delay', parseInt(e.target.value) || 0)}
                          className="text-xs h-8"
                          min="0"
                        />
                        <select 
                          value={step.delayUnit} 
                          onChange={(e) => updateStep(step.id, 'delayUnit', e.target.value)}
                          className="text-xs h-8 border border-gray-300 rounded px-2"
                        >
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Type</Label>
                      <select 
                        value={step.messageType} 
                        onChange={(e) => updateStep(step.id, 'messageType', e.target.value)}
                        className="text-xs h-8 border border-gray-300 rounded px-2"
                      >
                        <option value="connection_request">Connection Request</option>
                        <option value="first_message">First Message</option>
                        <option value="follow_up">Follow-up</option>
                        <option value="thank_you">Thank You</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs">Tone</Label>
                      <select 
                        value={step.tone} 
                        onChange={(e) => updateStep(step.id, 'tone', e.target.value)}
                        className="text-xs h-8 border border-gray-300 rounded px-2"
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="casual">Casual</option>
                      </select>
                    </div>

                    <div className="flex items-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateMessageForStep(step.id)}
                        disabled={loading || generatingStep === step.id}
                        className="h-8 text-xs"
                      >
                        <Wand2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeStep(step.id)}
                        className="h-8 text-xs"
                      >
                        ×
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Message</Label>
                    <Textarea
                      value={step.message}
                      onChange={(e) => updateStep(step.id, 'message', e.target.value)}
                      placeholder="Message content will appear here..."
                      className="text-sm min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={addCustomStep}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Step
          </Button>

          {steps.length > 0 && (
            <Button
              onClick={saveSequence}
              disabled={loading || !sequenceName.trim()}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Save Sequence
            </Button>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-blue-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {generatingStep ? `Generating ${generatingStep}...` : 'Processing...'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AISmartSequences;
