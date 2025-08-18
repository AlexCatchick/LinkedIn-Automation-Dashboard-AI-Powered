import { useState, useEffect } from 'react';
import { Button } from './components/ui/button';
import { Alert, AlertDescription } from './components/ui/alert';
import DashboardNew from './components/DashboardNew';
import CampaignIntakeFormNew from './components/CampaignIntakeFormNew';
import LoginFormNew from './components/LoginFormNew';
import { CampaignDetails } from './components/CampaignDetails';
import AIMessageOptimizer from './components/AIMessageOptimizer';
import AIAnalyticsDashboard from './components/AIAnalyticsDashboard';
import AISmartSequences from './components/AISmartSequences';
import AICampaignBuilder from './components/AICampaignBuilder';
import { apiService } from './services/api';
import type { User } from './types/api';
import { 
  BarChart3, 
  LogOut, 
  Wand2, 
  Zap, 
  Brain,
  UserCircle
} from 'lucide-react';

// Test API connection on load
if (import.meta.env.DEV) {
  console.log('🔧 Testing API connection...');
  apiService.healthCheck()
    .then(health => console.log('✅ Backend health:', health))
    .catch(error => console.error('❌ Backend connection failed:', error));
}

type AppView = 'login' | 'dashboard' | 'campaign-form' | 'campaign-details' | 'message-optimizer' | 'analytics' | 'smart-sequences' | 'ai-campaign-builder';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('login');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userData = await apiService.getCurrentUser();
        setUser(userData);
        setCurrentView('dashboard');
      }
    } catch (error) {
      // Token is invalid, remove it
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (userData: User) => {
    setUser(userData);
    setCurrentView('dashboard');
    setError(null);
  };

  const handleLogout = async () => {
    await apiService.logout();
    setUser(null);
    setCurrentView('login');
  };

  const handleCreateCampaign = () => {
    setCurrentView('campaign-form');
  };

  const handleCampaignComplete = (campaign: any) => {
    console.log('Campaign created:', campaign);
    setCurrentView('dashboard');
  };

  const handleCancelCampaign = () => {
    setCurrentView('dashboard');
  };

  const handleViewCampaign = (campaignId: string) => {
    console.log('View campaign:', campaignId);
    setSelectedCampaignId(campaignId);
    setIsEditMode(false);
    setCurrentView('campaign-details');
  };

  const handleEditCampaign = (campaignId: string) => {
    console.log('Edit campaign:', campaignId);
    setSelectedCampaignId(campaignId);
    setIsEditMode(true);
    setCurrentView('campaign-details');
    // We'll pass an edit flag to the CampaignDetails component
  };

  const handleBackToDashboard = () => {
    setSelectedCampaignId(null);
    setIsEditMode(false);
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user && (
        <header className="bg-white shadow-sm border-b">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <div className="flex items-center gap-8">
                <h1 className="text-xl font-semibold text-gray-900">
                  LinkedIn Automation Platform
                </h1>
                
                {/* Navigation Menu */}
                <nav className="hidden md:flex items-center gap-4">
                  <Button
                    variant={currentView === 'dashboard' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('dashboard')}
                  >
                    Dashboard
                  </Button>
                  <Button
                    variant={currentView === 'message-optimizer' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('message-optimizer')}
                    className="flex items-center gap-2"
                  >
                    <Wand2 className="h-4 w-4" />
                    AI Optimizer
                  </Button>
                  <Button
                    variant={currentView === 'smart-sequences' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('smart-sequences')}
                    className="flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Smart Sequences
                  </Button>
                  <Button
                    variant={currentView === 'analytics' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('analytics')}
                    className="flex items-center gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    AI Analytics
                  </Button>
                  <Button
                    variant={currentView === 'ai-campaign-builder' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentView('ai-campaign-builder')}
                    className="flex items-center gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    AI Builder
                  </Button>
                </nav>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <UserCircle className="h-5 w-5" />
                  <span>Welcome, {user.full_name}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={user ? "" : "min-h-screen"}>
        {error && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
            <Alert className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {currentView === 'login' && (
          <LoginFormNew onLogin={handleLogin} />
        )}

        {currentView === 'dashboard' && (
          <DashboardNew
            onCreateCampaign={handleCreateCampaign}
            onViewCampaign={handleViewCampaign}
            onEditCampaign={handleEditCampaign}
            onNavigateToAI={(view: string) => setCurrentView(view as AppView)}
          />
        )}

        {currentView === 'campaign-form' && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <CampaignIntakeFormNew
              onComplete={handleCampaignComplete}
              onCancel={handleCancelCampaign}
            />
          </div>
        )}

        {currentView === 'campaign-details' && selectedCampaignId && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <CampaignDetails
              campaignId={selectedCampaignId}
              onBack={handleBackToDashboard}
              startInEditMode={isEditMode}
            />
          </div>
        )}

        {currentView === 'message-optimizer' && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold">AI Message Optimizer</h2>
              </div>
              <p className="text-gray-600">Enhance your LinkedIn messages with AI-powered optimization and A/B testing.</p>
            </div>
            <AIMessageOptimizer />
          </div>
        )}

        {currentView === 'smart-sequences' && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-6 w-6 text-purple-600" />
                <h2 className="text-2xl font-bold">AI Smart Sequences</h2>
              </div>
              <p className="text-gray-600">Create intelligent follow-up sequences with AI-generated messaging.</p>
            </div>
            <AISmartSequences 
              onSequenceCreated={(sequence) => {
                console.log('New AI sequence created:', sequence);
                setCurrentView('dashboard');
              }}
            />
          </div>
        )}

        {currentView === 'analytics' && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-6 w-6 text-green-600" />
                <h2 className="text-2xl font-bold">AI Analytics Dashboard</h2>
              </div>
              <p className="text-gray-600">Get actionable insights powered by AI analysis of your campaign performance.</p>
            </div>
            <AIAnalyticsDashboard />
          </div>
        )}

        {currentView === 'ai-campaign-builder' && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-6 w-6 text-blue-600" />
                <h2 className="text-2xl font-bold">AI Campaign Builder</h2>
              </div>
              <p className="text-gray-600">Build high-converting LinkedIn campaigns with AI assistance at every step.</p>
            </div>
            <AICampaignBuilder 
              onCampaignCreated={(campaign) => {
                console.log('New AI campaign created:', campaign);
                setCurrentView('dashboard');
              }}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
