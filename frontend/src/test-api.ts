// Quick test script to verify API connection
import { apiService } from './services/api';

export const testAPI = async () => {
  try {
    console.log('Testing API connection...');
    
    // Test health check
    const health = await apiService.healthCheck();
    console.log('✅ Health check:', health);
    
    // Test demo login
    const loginResult = await apiService.login({
      email: 'demo@linkedin.com',
      password: 'demo123'
    });
    console.log('✅ Demo login:', loginResult);
    
    // Test getting campaigns
    const campaigns = await apiService.getCampaigns();
    console.log('✅ Campaigns:', campaigns);
    
    return true;
  } catch (error) {
    console.error('❌ API test failed:', error);
    return false;
  }
};

// Auto-run test if in development
if (import.meta.env.DEV) {
  testAPI();
}
