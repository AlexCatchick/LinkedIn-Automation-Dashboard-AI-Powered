import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wand2, 
  TrendingUp, 
  Copy, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Zap,
  BarChart3
} from 'lucide-react';
import { aiService } from '../services/aiService';

interface AIMessageOptimizerProps {
  originalMessage?: string;
  onOptimizedMessage?: (message: string) => void;
  className?: string;
}

export const AIMessageOptimizer: React.FC<AIMessageOptimizerProps> = ({
  originalMessage = '',
  onOptimizedMessage,
  className = ''
}) => {
  const [message, setMessage] = useState(originalMessage);
  const [optimizedMessage, setOptimizedMessage] = useState('');
  const [variations, setVariations] = useState<any[]>([]);
  const [optimization, setOptimization] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('optimize');
  const [error, setError] = useState<string | null>(null);

  // Real-time engagement prediction
  const calculateEngagementScore = (text: string): number => {
    if (!text.trim()) return 0;
    
    let score = 50; // Base score
    
    // Length optimization (85-120 characters is optimal)
    const length = text.length;
    if (length >= 85 && length <= 120) {
      score += 15;
    } else if (length < 85) {
      score += Math.max(0, 10 - (85 - length) * 0.5);
    } else {
      score -= Math.max(0, (length - 120) * 0.3);
    }
    
    // Personalization indicators
    if (text.includes('{name}') || text.includes('{company}')) score += 10;
    if (text.match(/\b(you|your)\b/gi)) score += 5;
    
    // Call-to-action presence
    if (text.match(/\b(connect|chat|discuss|call|meeting|demo)\b/gi)) score += 8;
    
    // Question engagement
    if (text.includes('?')) score += 5;
    
    // Professional tone indicators
    if (text.match(/\b(experience|expertise|success|growth|innovation)\b/gi)) score += 5;
    
    // Avoid spam indicators
    if (text.match(/\b(buy|purchase|sale|offer|deal|limited time)\b/gi)) score -= 10;
    if (text.includes('!!!') || text.includes('$$$')) score -= 15;
    
    return Math.min(100, Math.max(0, Math.round(score)));
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeColor = (score: number): string => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const handleOptimizeMessage = async () => {
    if (!message.trim()) {
      setError('Please enter a message to optimize');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const context = {
        messageType: 'connection_request',
        targetAudience: 'professionals',
        campaignGoal: 'increase_connections'
      };

      const result = await aiService.optimizeMessage(message, context);
      setOptimization(result);
      setOptimizedMessage(result.optimizedMessage);
    } catch (error) {
      console.error('Failed to optimize message:', error);
      setError('Failed to optimize message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateVariations = async () => {
    if (!message.trim()) {
      setError('Please enter a message to generate variations');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await aiService.generateMessageVariations(message, 3);
      setVariations(result);
    } catch (error) {
      console.error('Failed to generate variations:', error);
      setError('Failed to generate variations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const useOptimizedMessage = () => {
    if (optimizedMessage && onOptimizedMessage) {
      onOptimizedMessage(optimizedMessage);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-blue-600" />
          <CardTitle>AI Message Optimizer</CardTitle>
        </div>
        <CardDescription>
          Enhance your messages with AI-powered optimization and A/B testing variations
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Message Templates */}
          <div>
            <label className="text-sm font-medium mb-2 block">Quick Templates</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setMessage("Hi {name}, I noticed your experience in {industry}. I'd love to connect and learn more about your insights in this space.")}
                className="text-left justify-start h-auto p-3"
              >
                <div>
                  <div className="font-medium text-xs">Connection Request</div>
                  <div className="text-xs text-gray-500">Professional networking</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setMessage("Hi {name}, I saw your recent post about {topic}. Your perspective on {specific_point} really resonated with me. Would love to continue the conversation!")}
                className="text-left justify-start h-auto p-3"
              >
                <div>
                  <div className="font-medium text-xs">Engagement Follow-up</div>
                  <div className="text-xs text-gray-500">Post interaction</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setMessage("Hi {name}, I help {industry} companies achieve {benefit}. Given {company}'s focus on {area}, I thought you might find our approach interesting. Worth a brief chat?")}
                className="text-left justify-start h-auto p-3"
              >
                <div>
                  <div className="font-medium text-xs">Value Proposition</div>
                  <div className="text-xs text-gray-500">Sales outreach</div>
                </div>
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Original Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your LinkedIn message here..."
              className="min-h-[100px]"
            />
            
            {/* Real-time feedback */}
            <div className="flex justify-between items-center mt-2 text-sm">
              <div className="flex items-center gap-4">
                <span className={`${message.length > 120 ? 'text-red-500' : message.length >= 85 ? 'text-green-500' : 'text-yellow-500'}`}>
                  {message.length} characters
                </span>
                <span className="text-gray-500">
                  Optimal: 85-120 chars
                </span>
              </div>
              
              {message.trim() && (
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <Badge className={getScoreBadgeColor(calculateEngagementScore(message))}>
                    Engagement: {calculateEngagementScore(message)}%
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="optimize">Optimize</TabsTrigger>
              <TabsTrigger value="variations">A/B Variations</TabsTrigger>
            </TabsList>

            <TabsContent value="optimize" className="space-y-4">
              <Button
                onClick={handleOptimizeMessage}
                disabled={loading || !message.trim()}
                className="w-full"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Optimizing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Optimize Message
                  </div>
                )}
              </Button>

              {optimization && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-800">Optimized Message</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(optimizedMessage)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={useOptimizedMessage}
                        >
                          Use This
                        </Button>
                      </div>
                    </div>
                    <p className="text-gray-800 leading-relaxed">{optimizedMessage}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Engagement Prediction
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round((optimization.engagementPrediction || 0) * 100)}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Expected response rate
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Improvements
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {optimization.improvements?.slice(0, 2).map((improvement: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {improvement}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="variations" className="space-y-4">
              <Button
                onClick={handleGenerateVariations}
                disabled={loading || !message.trim()}
                className="w-full"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating Variations...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Generate A/B Variations
                  </div>
                )}
              </Button>

              {variations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Message Variations for A/B Testing</h4>
                  {variations.map((variation, index) => (
                    <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Variation {index + 1}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {variation.focus}
                          </Badge>
                          <span className="text-xs text-blue-600">
                            {Math.round((variation.confidence || 0) * 100)}% confidence
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(variation.message)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOptimizedMessage?.(variation.message)}
                          >
                            Use This
                          </Button>
                        </div>
                      </div>
                      <p className="text-gray-800 text-sm leading-relaxed">{variation.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIMessageOptimizer;
