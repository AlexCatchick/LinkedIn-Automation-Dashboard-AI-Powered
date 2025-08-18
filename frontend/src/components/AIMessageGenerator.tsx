import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Wand2, 
  RefreshCw, 
  Copy, 
  Check, 
  Sparkles, 
  BarChart3,
  MessageSquare,
  Target,
  Users
} from 'lucide-react';
import { aiService, type AIMessageRequest, type AIMessageResponse } from '../services/aiService';

interface AIMessageGeneratorProps {
  prospectName?: string;
  prospectTitle?: string;
  prospectCompany?: string;
  prospectIndustry?: string;
  campaignData?: {
    goal: string;
    tone: 'professional' | 'casual' | 'friendly';
    valueProposition?: string;
    painPoints?: string[];
    callToAction?: string;
  };
  messageType: 'connection_request' | 'first_message' | 'follow_up' | 'thank_you';
  onMessageSelect: (message: string) => void;
  onClose?: () => void;
}

export const AIMessageGenerator: React.FC<AIMessageGeneratorProps> = ({
  prospectName = '',
  prospectTitle = '',
  prospectCompany = '',
  prospectIndustry = '',
  campaignData,
  messageType,
  onMessageSelect,
  onClose
}) => {
  const [generatedMessage, setGeneratedMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIMessageResponse | null>(null);
  const [variations, setVariations] = useState<string[]>([]);
  const [isLoadingVariations, setIsLoadingVariations] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Form state for customization
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedTone, setSelectedTone] = useState(campaignData?.tone || 'professional');

  const generateMessage = async () => {
    setIsGenerating(true);
    setError('');
    
    try {
      const request: AIMessageRequest = {
        prospectName,
        prospectTitle,
        prospectCompany,
        prospectIndustry,
        campaignGoal: campaignData?.goal || 'Build professional relationships',
        messageTone: selectedTone,
        messageType,
        valueProposition: campaignData?.valueProposition,
        painPoints: campaignData?.painPoints,
        callToAction: campaignData?.callToAction,
        companyInfo: customPrompt
      };

      const response = await aiService.generateMessage(request);
      setAiResponse(response);
      setGeneratedMessage(response.generatedMessage);
    } catch (err) {
      setError('Failed to generate message. Please try again.');
      console.error('Message generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateVariations = async () => {
    if (!generatedMessage) return;
    
    setIsLoadingVariations(true);
    try {
      const variationList = await aiService.generateMessageVariations(generatedMessage, 3);
      setVariations(variationList);
    } catch (err) {
      console.error('Variation generation error:', err);
    } finally {
      setIsLoadingVariations(false);
    }
  };

  const copyToClipboard = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessage(message);
      setTimeout(() => setCopiedMessage(null), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const optimizeMessage = async () => {
    if (!generatedMessage) return;
    
    setIsGenerating(true);
    try {
      const optimization = await aiService.optimizeMessage(generatedMessage, {
        messageType,
        targetAudience: `${prospectTitle} at ${prospectCompany}`,
        campaignGoal: campaignData?.goal || 'Professional networking'
      });
      setGeneratedMessage(optimization.optimizedMessage);
      
      // Update AI response with optimization data
      if (aiResponse) {
        setAiResponse({
          ...aiResponse,
          generatedMessage: optimization.optimizedMessage,
          suggestions: optimization.improvements,
          confidence: optimization.engagementPrediction
        });
      }
    } catch (err) {
      console.error('Message optimization error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const getMessageTypeLabel = () => {
    const labels = {
      connection_request: 'Connection Request',
      first_message: 'First Message',
      follow_up: 'Follow-up Message',
      thank_you: 'Thank You Message'
    };
    return labels[messageType];
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Message Generator
          </h3>
          <p className="text-sm text-gray-600">
            Generate personalized {getMessageTypeLabel().toLowerCase()} for {prospectName || 'prospect'}
          </p>
        </div>
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Prospect Context */}
      {(prospectName || prospectCompany) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Prospect Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {prospectName && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Name:</span>
                <Badge variant="outline">{prospectName}</Badge>
              </div>
            )}
            {prospectTitle && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Title:</span>
                <Badge variant="outline">{prospectTitle}</Badge>
              </div>
            )}
            {prospectCompany && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Company:</span>
                <Badge variant="outline">{prospectCompany}</Badge>
              </div>
            )}
            {prospectIndustry && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Industry:</span>
                <Badge variant="outline">{prospectIndustry}</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Customization Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4" />
            Customization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Message Tone</label>
            <select
              value={selectedTone}
              onChange={(e) => setSelectedTone(e.target.value as any)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="friendly">Friendly</option>
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium">Additional Context (Optional)</label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Add any specific information about your company, recent news, or common connections..."
              className="mt-1"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Generate Button */}
      <Button 
        onClick={generateMessage} 
        disabled={isGenerating}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Generating AI Message...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Generate Personalized Message
          </>
        )}
      </Button>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Generated Message */}
      {generatedMessage && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Generated Message
            </CardTitle>
            <div className="flex items-center gap-2">
              {aiResponse && (
                <div className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  <span className={`text-xs font-medium ${getConfidenceColor(aiResponse.confidence)}`}>
                    {Math.round(aiResponse.confidence * 100)}% confidence
                  </span>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(generatedMessage)}
              >
                {copiedMessage === generatedMessage ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={generatedMessage}
              onChange={(e) => setGeneratedMessage(e.target.value)}
              className="min-h-[120px]"
              placeholder="Generated message will appear here..."
            />
            
            <div className="flex items-center gap-2 mt-4">
              <Button
                onClick={() => onMessageSelect(generatedMessage)}
                className="flex-1"
              >
                Use This Message
              </Button>
              <Button
                variant="outline"
                onClick={optimizeMessage}
                disabled={isGenerating}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Optimize
              </Button>
              <Button
                variant="outline"
                onClick={generateVariations}
                disabled={isLoadingVariations}
              >
                {isLoadingVariations ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Variations'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {aiResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiResponse.personalizedElements.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-1">Personalized Elements:</h4>
                  <div className="flex flex-wrap gap-1">
                    {aiResponse.personalizedElements.map((element, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {element}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {aiResponse.suggestions.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-700 mb-1">Suggestions:</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {aiResponse.suggestions.map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Variations */}
      {variations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Alternative Versions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {variations.map((variation, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">
                      Variation {index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(variation)}
                    >
                      {copiedMessage === variation ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-900 mb-2">{variation}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMessageSelect(variation)}
                    className="w-full"
                  >
                    Use This Variation
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
