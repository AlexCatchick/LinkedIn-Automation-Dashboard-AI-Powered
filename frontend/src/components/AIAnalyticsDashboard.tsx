import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  TrendingUp, 
  Target,
  BarChart3,
  Lightbulb,
  Zap,
  RefreshCw
} from 'lucide-react';

interface AIAnalyticsDashboardProps {
  campaigns?: any[];
  className?: string;
}

interface AIInsight {
  type: 'performance' | 'optimization' | 'trend' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  actionable: boolean;
  data?: any;
}

export const AIAnalyticsDashboard: React.FC<AIAnalyticsDashboardProps> = ({
  className = ''
}) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    aiOptimizedMessages: 127,
    averageResponseRate: 23,
    topPerformingTone: 'professional',
    messagingEfficiency: 85,
    prospectFitScore: 89
  });

  useEffect(() => {
    // Only initialize on component mount, not when campaigns change
    generateAIInsights(false); // Don't refresh metrics on initial load
  }, []); // Remove campaigns dependency to prevent auto-refresh

  const handleRefreshInsights = () => {
    generateAIInsights(false); // Just refresh insights, not metrics
  };

  const handleRefreshMetrics = () => {
    generateAIInsights(true); // Refresh both insights and metrics
  };

  const generateAIInsights = async (refreshMetrics: boolean = false) => {
    setLoading(true);
    
    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate mock AI insights based on campaign data
    const mockInsights: AIInsight[] = [
      {
        type: 'performance',
        title: 'Response Rate Optimization Opportunity',
        description: 'Messages with industry-specific pain points show 23% higher response rates. Consider personalizing your value propositions.',
        impact: 'high',
        actionable: true,
        data: { improvement: 23, metric: 'response_rate' }
      },
      {
        type: 'trend',
        title: 'Optimal Outreach Timing Detected',
        description: 'Your prospects are most responsive on Tuesday-Thursday between 9-11 AM. Adjust your campaign schedule for better engagement.',
        impact: 'medium',
        actionable: true,
        data: { days: ['Tuesday', 'Wednesday', 'Thursday'], time: '9-11 AM' }
      },
      {
        type: 'optimization',
        title: 'Message Length Sweet Spot',
        description: 'Messages between 85-120 characters get 35% more responses. Your current average is 156 characters.',
        impact: 'high',
        actionable: true,
        data: { current: 156, optimal: '85-120', improvement: 35 }
      },
      {
        type: 'recommendation',
        title: 'Industry Targeting Insight',
        description: 'Technology and SaaS prospects show highest engagement. Consider focusing 60% of your outreach on these sectors.',
        impact: 'medium',
        actionable: true,
        data: { topIndustries: ['Technology', 'SaaS', 'Healthcare'] }
      },
      {
        type: 'trend',
        title: 'Personalization Impact Analysis',
        description: 'Messages with company-specific references have 2.3x higher connection acceptance rates.',
        impact: 'high',
        actionable: true,
        data: { multiplier: 2.3, factor: 'company_references' }
      }
    ];

    setInsights(mockInsights);
    
    // Only update performance metrics when explicitly requested
    if (refreshMetrics) {
      setPerformanceMetrics({
        aiOptimizedMessages: Math.floor(Math.random() * 150) + 50,
        averageResponseRate: Math.floor(Math.random() * 20) + 15,
        topPerformingTone: ['professional', 'friendly', 'casual'][Math.floor(Math.random() * 3)],
        messagingEfficiency: Math.floor(Math.random() * 30) + 70,
        prospectFitScore: Math.floor(Math.random() * 25) + 75
      });
    }
    
    setLoading(false);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return <TrendingUp className="h-4 w-4" />;
      case 'optimization': return <Zap className="h-4 w-4" />;
      case 'trend': return <BarChart3 className="h-4 w-4" />;
      case 'recommendation': return <Lightbulb className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  return (
    <div className={className}>
      {/* AI Performance Metrics */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">AI Performance Metrics</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefreshMetrics}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI-Optimized Messages</CardTitle>
            <Brain className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.aiOptimizedMessages}</div>
            <p className="text-xs text-muted-foreground">Generated this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.averageResponseRate}%</div>
            <p className="text-xs text-muted-foreground">AI-enhanced average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messaging Efficiency</CardTitle>
            <Zap className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.messagingEfficiency}%</div>
            <p className="text-xs text-muted-foreground">Time saved with AI</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prospect Fit Score</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{performanceMetrics.prospectFitScore}%</div>
            <p className="text-xs text-muted-foreground">AI-calculated average</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              <CardTitle>AI-Powered Insights</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshInsights}
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh Insights
            </Button>
          </div>
          <CardDescription>
            Actionable recommendations powered by AI analysis of your campaign performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(insight.type)}
                      <h4 className="font-medium text-sm">{insight.title}</h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getImpactColor(insight.impact)}`}
                      >
                        {insight.impact} impact
                      </Badge>
                    </div>
                    {insight.actionable && (
                      <Button variant="outline" size="sm">
                        Take Action
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {insight.description}
                  </p>
                  
                  {insight.data && (
                    <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                      <strong>Data:</strong>
                      {insight.data.improvement && (
                        <span className="ml-2 text-green-600">
                          +{insight.data.improvement}% improvement potential
                        </span>
                      )}
                      {insight.data.multiplier && (
                        <span className="ml-2 text-green-600">
                          {insight.data.multiplier}x higher performance
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Message Tone Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Professional</span>
              <span className="text-sm font-medium">32%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '32%' }}></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Friendly</span>
              <span className="text-sm font-medium">45%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '45%' }}></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Casual</span>
              <span className="text-sm font-medium">23%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '23%' }}></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Optimal Timing Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Best Day:</span>
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  Tuesday
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Best Time:</span>
                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                  9-11 AM
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Response Rate:</span>
                <span className="font-medium text-green-600">+23%</span>
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-600">
                Messages sent on Tuesday mornings receive the highest engagement rates.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Industry Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Technology</span>
              <span className="text-sm font-medium text-green-600">87%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Healthcare</span>
              <span className="text-sm font-medium text-blue-600">72%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Finance</span>
              <span className="text-sm font-medium text-yellow-600">64%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Other</span>
              <span className="text-sm font-medium text-gray-600">58%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIAnalyticsDashboard;
