import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { apiService } from '../services/api';
import type { User, LoginRequest, RegisterRequest } from '../types/api';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
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
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      company: '',
      position: ''
    }
  });

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            LinkedIn Automation
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            AI-Powered Sales Outreach Platform
          </p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
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
                        <div>
                          <Input
                            {...field}
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            disabled={loading}
                          />
                          {fieldState.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Controller
                      name="password"
                      control={loginForm.control}
                      rules={{ required: 'Password is required' }}
                      render={({ field, fieldState }) => (
                        <div>
                          <Input
                            {...field}
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            disabled={loading}
                          />
                          {fieldState.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                    onClick={handleDemoLogin}
                  >
                    Demo Login
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Controller
                      name="firstName"
                      control={registerForm.control}
                      rules={{ required: 'First name is required' }}
                      render={({ field, fieldState }) => (
                        <div>
                          <Input
                            {...field}
                            id="firstName"
                            placeholder="Enter your first name"
                            disabled={loading}
                          />
                          {fieldState.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Controller
                      name="lastName"
                      control={registerForm.control}
                      rules={{ required: 'Last name is required' }}
                      render={({ field, fieldState }) => (
                        <div>
                          <Input
                            {...field}
                            id="lastName"
                            placeholder="Enter your last name"
                            disabled={loading}
                          />
                          {fieldState.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register_email">Email</Label>
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
                        <div>
                          <Input
                            {...field}
                            id="register_email"
                            type="email"
                            placeholder="Enter your email"
                            disabled={loading}
                          />
                          {fieldState.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register_password">Password</Label>
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
                        <div>
                          <Input
                            {...field}
                            id="register_password"
                            type="password"
                            placeholder="Enter your password"
                            disabled={loading}
                          />
                          {fieldState.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {fieldState.error.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Company (Optional)</Label>
                    <Controller
                      name="company"
                      control={registerForm.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="company"
                          placeholder="Enter your company name"
                          disabled={loading}
                        />
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position">Position (Optional)</Label>
                    <Controller
                      name="position"
                      control={registerForm.control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          id="position"
                          placeholder="Enter your position"
                          disabled={loading}
                        />
                      )}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Demo: demo@linkedin.com / demo123 or click "Demo Login"
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
