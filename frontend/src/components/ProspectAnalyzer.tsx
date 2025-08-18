import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Lightbulb, 
  Users, 
  MessageCircle,
  Star,
  RefreshCw,
  Eye
} from 'lucide-react';
import { aiService, type ProspectAnalysis } from '../services/aiService';

interface ProspectAnalyzerProps {
  prospectId: string;
  prospectData: {
    linkedinUrl: string;
    fullName?: string;
    title?: string;
    company?: string;
    industry?: string;
    profileData?: any;
  };
  onAnalysisComplete?: (analysis: ProspectAnalysis) => void;
}

export const ProspectAnalyzer: React.FC<ProspectAnalyzerProps> = ({
  prospectId,
  prospectData,
  onAnalysisComplete
}) => {
  const [analysis, setAnalysis] = useState<ProspectAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Auto-analyze on component mount if we have prospect data
    if (prospectData.linkedinUrl) {
      analyzeProspect();
    }
  }, [prospectData.linkedinUrl]);

  const analyzeProspect = async () => {
    setIsAnalyzing(true);
    setError('');
    
    try {
      const analysisResult = await aiService.analyzeProspect(prospectData);
      setAnalysis(analysisResult);
      onAnalysisComplete?.(analysisResult);
    } catch (err) {
      setError('Failed to analyze prospect. Please try again.');
      console.error('Prospect analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getFitScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFitScoreLabel = (score: number) => {
    if (score >= 0.8) return 'Excellent Fit';
    if (score >= 0.6) return 'Good Fit';
    if (score >= 0.4) return 'Moderate Fit';
    return 'Low Fit';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Prospect Analysis
          </h3>
          <p className="text-sm text-gray-600">
            AI-powered insights for {prospectData.fullName || 'prospect'}
          </p>
        </div>
        <Button
          onClick={analyzeProspect}
          disabled={isAnalyzing}
          variant="outline"
          size="sm"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Re-analyze
            </>
          )}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">Analyzing prospect profile...</p>
              <div className="w-full max-w-xs">
                <Progress value={33} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && !isAnalyzing && (
        <div className="space-y-4">
          {/* Fit Score */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                Prospect Fit Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl font-bold text-gray-900">
                    {Math.round(analysis.fitScore * 100)}
                  </div>
                  <div>
                    <div className={`font-medium ${getFitScoreColor(analysis.fitScore)}`}>
                      {getFitScoreLabel(analysis.fitScore)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Based on profile analysis
                    </div>
                  </div>
                </div>
                <div className="w-24">
                  <Progress 
                    value={analysis.fitScore * 100} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Key Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.keyInsights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Personalized Hooks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                Personalized Hooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
                {analysis.personalizedHooks.map((hook, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="justify-start p-2 h-auto text-left"
                  >
                    {hook}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommended Approach */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-purple-500" />
                Recommended Approach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 leading-relaxed">
                {analysis.recommendedApproach}
              </p>
            </CardContent>
          </Card>

          {/* Connection Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Connection Strategy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 leading-relaxed">
                {analysis.connectionStrategy}
              </p>
            </CardContent>
          </Card>

          {/* Industry Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Relevant Industry Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.industryTrends.map((trend, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-indigo-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{trend}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Items */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-sm text-green-800">
                Recommended Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-600 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-green-700">
                    Use the personalized hooks to craft your connection request
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-600 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-green-700">
                    Reference relevant industry trends in your outreach
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-600 mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-green-700">
                    Follow the recommended approach for best results
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!analysis && !isAnalyzing && (
        <Card>
          <CardContent className="p-8 text-center">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Ready to Analyze
            </h3>
            <p className="text-gray-600 mb-4">
              Get AI-powered insights about this prospect to improve your outreach success.
            </p>
            <Button onClick={analyzeProspect}>
              <Brain className="h-4 w-4 mr-2" />
              Start Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
