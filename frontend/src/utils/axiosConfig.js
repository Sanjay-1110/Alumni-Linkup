import axios from 'axios';

// Create axios instance with base URL
const axiosInstance = axios.create({
    baseURL: 'http://localhost:8000'
});

// Add request interceptor to add token
axiosInstance.interceptors.request.use(
    (config) => {
        // Use access_token instead of token to match what's stored in AuthContext
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.warn('No access token found in localStorage');
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.log('Authentication error (401) detected');
            // Token expired or invalid - clear both tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('userId');
            
            // Only redirect if we're not already on the login page
            if (!window.location.pathname.includes('/login')) {
                console.log('Redirecting to login page');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosInstance; 