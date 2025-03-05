import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:8000';
axios.defaults.withCredentials = true;

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me/');
      setUser(response.data);
    } catch (error) {
      console.error('Fetch user error:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
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
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      setUser(responseUser);
      return { success: true, message: response.data.message || 'Registration successful!' };
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
      const response = await axios.post('/api/auth/login/', {
        email,
        password
      });

      const { user, access, refresh } = response.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      setUser(user);
      setLoading(false);
      return response.data;
    } catch (error) {
      setError(error.response?.data?.error || 'An error occurred during login');
      setLoading(false);
      throw error;
    }
  };

  const googleAuth = async (token, registerData = null) => {
    try {
      console.log('Sending Google auth request:', {
        token,
        register_data: registerData
      });

      const response = await axios.post('/api/auth/google_auth/', {
        token,
        register_data: registerData
      });
      
      console.log('Google auth response:', response.data);
      
      const { access, refresh, user: userData } = response.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      console.error('Google auth error details:', {
        data: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      const errorMessage = error.response?.data?.detail || 
                         error.response?.data?.error ||
                         'Google authentication failed. Please try again.';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    loading,
    error,
    register,
    login,
    googleAuth,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 