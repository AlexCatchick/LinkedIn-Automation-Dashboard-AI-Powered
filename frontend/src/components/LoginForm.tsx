import { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Tab,
  Tabs,
  Alert,
  Container
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { apiService } from '../services/api';
import type { User, LoginRequest, RegisterRequest } from '../types/api';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginForm = useForm<LoginRequest>({
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const registerForm = useForm<RegisterRequest>({
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      organization_name: ''
    }
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    setError(null);
  };

  const handleLogin = async (data: LoginRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.login(data);
      onLogin(response.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (data: RegisterRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.register(data);
      onLogin(response.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.demoLogin();
      onLogin(response.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh' 
      }}>
        <Paper elevation={3} sx={{ width: '100%', maxWidth: 500 }}>
          <Box sx={{ textAlign: 'center', p: 3, pb: 0 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              LinkedIn Automation
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              AI-Powered Sales Outreach Platform
            </Typography>
          </Box>

          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={handleTabChange} aria-label="auth tabs">
              <Tab label="Login" />
              <Tab label="Register" />
            </Tabs>
          </Box>

          {error && (
            <Alert severity="error" sx={{ m: 3, mb: 0 }}>
              {error}
            </Alert>
          )}

          <TabPanel value={activeTab} index={0}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Controller
                  name="email"
                  control={loginForm.control}
                  rules={{ 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Email"
                      type="email"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      disabled={loading}
                    />
                  )}
                />

                <Controller
                  name="password"
                  control={loginForm.control}
                  rules={{ required: 'Password is required' }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Password"
                      type="password"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      disabled={loading}
                    />
                  )}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{ mt: 1 }}
                  onClick={handleDemoLogin}
                >
                  Demo Login
                </Button>
              </Box>
            </form>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <form onSubmit={registerForm.handleSubmit(handleRegister)}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Controller
                  name="full_name"
                  control={registerForm.control}
                  rules={{ required: 'Full name is required' }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Full Name"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      disabled={loading}
                    />
                  )}
                />

                <Controller
                  name="email"
                  control={registerForm.control}
                  rules={{ 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Email"
                      type="email"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      disabled={loading}
                    />
                  )}
                />

                <Controller
                  name="password"
                  control={registerForm.control}
                  rules={{ 
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Password"
                      type="password"
                      fullWidth
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      disabled={loading}
                    />
                  )}
                />

                <Controller
                  name="organization_name"
                  control={registerForm.control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Organization Name (Optional)"
                      fullWidth
                      disabled={loading}
                    />
                  )}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  sx={{ mt: 2 }}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </Box>
            </form>
          </TabPanel>
        </Paper>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            Demo: demo@linkedin.com / demo123 or click "Demo Login"
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginForm;
