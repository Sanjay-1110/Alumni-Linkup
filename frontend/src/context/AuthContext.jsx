import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:8000';
axios.defaults.withCredentials = true;

// Initialize context with default values to avoid undefined
const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  setUser: () => {},
  setError: () => {},
  register: async () => {},
  login: async () => {},
  logout: () => {}
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          await fetchUser();
        } else {
          setLoading(false);
        }
        setInitialized(true);
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
        setInitialized(true);
      }
    };

    initializeAuth();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me/');
      setUser(response.data);
      
      // Make sure userId is set in localStorage
      if (response.data && response.data.id) {
        localStorage.setItem('userId', response.data.id);
        console.log('Set userId in localStorage:', response.data.id);
      }
    } catch (error) {
      console.error('Fetch user error:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('userId');
      delete axios.defaults.headers.common['Authorization'];
    }
    setLoading(false);
  };

  const register = async (userData) => {
    try {
      console.log('Sending registration data:', userData);
      const response = await axios.post('/api/auth/register/', {
        ...userData,
        username: userData.email,
      });
      console.log('Registration response:', response.data);
      
      const { access, refresh, user: responseUser } = response.data;
      
      // Store tokens and user ID
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      // Store user ID for WebSocket authentication
      if (responseUser && responseUser.id) {
        localStorage.setItem('userId', responseUser.id);
        console.log('Stored userId in localStorage:', responseUser.id);
      } else {
        console.warn('User ID missing from registration response');
      }
      
      // Set default axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      setUser(responseUser);
      return { success: true, message: 'Registration successful!' };
    } catch (error) {
      console.error('Registration error details:', {
        data: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      const errorMessage = error.response?.data?.error 
        ? (typeof error.response.data.error === 'object' 
            ? Object.values(error.response.data.error).flat().join(' ') 
            : error.response.data.error)
        : error.response?.data?.message || 'Registration failed. Please try again.';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Attempting login for:', email);
      const response = await axios.post('/api/auth/login/', {
        email,
        password
      });

      console.log('Login response:', response.data);
      const { user: responseUser, access, refresh } = response.data;
      
      // Store the tokens and user ID
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      // Make sure to store the user ID for WebSocket authentication
      if (responseUser && responseUser.id) {
        localStorage.setItem('userId', responseUser.id);
        console.log('Stored userId in localStorage:', responseUser.id);
      } else {
        console.error('User ID missing from login response');
      }
      
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      setUser(responseUser);
      setLoading(false);
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response || error);
      setError(error.response?.data?.error || 'An error occurred during login');
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userId');
    delete axios.defaults.headers.common['Authorization'];
    console.log('User logged out, all auth data removed from localStorage');
  };

  const value = {
    user,
    loading,
    error,
    initialized,
    setUser,
    setError,
    register,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 