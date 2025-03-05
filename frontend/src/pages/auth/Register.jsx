import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirm_password: '',
    graduation_year: new Date().getFullYear(),
    department: 'CSE',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register, googleAuth } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Frontend validation
    const validationErrors = [];

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      validationErrors.push('Please enter a valid email address');
    }

    // Password validation
    if (formData.password.length < 8) {
      validationErrors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(formData.password)) {
      validationErrors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(formData.password)) {
      validationErrors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(formData.password)) {
      validationErrors.push('Password must contain at least one number');
    }

    // Password confirmation
    if (formData.password !== formData.confirm_password) {
      validationErrors.push('Passwords do not match');
    }

    // Required fields
    if (!formData.first_name || !formData.last_name) {
      validationErrors.push('First name and last name are required');
    }

    // Graduation year validation
    const currentYear = new Date().getFullYear();
    if (formData.graduation_year < 1900 || formData.graduation_year > currentYear + 10) {
      validationErrors.push('Please enter a valid graduation year');
    }

    // If there are validation errors, display them and stop
    if (validationErrors.length > 0) {
      setError(validationErrors.join('\n'));
      setLoading(false);
      return;
    }

    // Convert graduation_year to number
    const registrationData = {
      ...formData,
      graduation_year: parseInt(formData.graduation_year),
    };

    try {
      const result = await register(registrationData);
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setError(
          typeof result.error === 'object'
            ? Object.values(result.error).flat().join('\n')
            : result.error
        );
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Registration error:', err);
    }
    setLoading(false);
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (response) => {
      try {
        setLoading(true);
        setError('');
        
        // First try to authenticate with Google without registration data
        let result = await googleAuth(response.access_token);
        
        // If the backend requires registration data
        if (!result.success && result.error?.includes('User does not exist')) {
          // Try again with registration data using only graduation year and department
          const registerData = {
            graduation_year: parseInt(formData.graduation_year),
            department: formData.department
          };

          result = await googleAuth(response.access_token, registerData);
        }
        
        if (result.success) {
          setSuccess('Successfully signed in with Google!');
          setTimeout(() => {
            navigate('/dashboard');
          }, 1500);
        } else {
          setError(result.error || 'Failed to authenticate with Google');
        }
      } catch (error) {
        console.error('Google auth error:', error);
        setError('Failed to authenticate with Google. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google login error:', error);
      setError('Google Sign-In failed. Please try again.');
      setLoading(false);
    },
    flow: 'implicit'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-lg"
      >
        <div>
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center text-3xl font-bold text-gray-900"
          >
            Join LinkUp
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2 text-center text-sm text-gray-600"
          >
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign in
            </Link>
          </motion.p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 text-red-500 p-4 rounded-lg"
          >
            {error.split('\n').map((err, index) => (
              <div key={index} className="flex items-start mb-1 last:mb-0">
                <span className="mr-2">•</span>
                <span>{err}</span>
              </div>
            ))}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 text-green-500 p-3 rounded-lg text-sm"
          >
            {success}
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleGoogleLogin()}
          className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <img src="/google.svg" alt="Google" className="w-5 h-5" />
          Sign up with Google
        </motion.button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 space-y-6"
          onSubmit={handleSubmit}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                First name
              </label>
              <input
                name="first_name"
                type="text"
                required
                value={formData.first_name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Last name
              </label>
              <input
                name="last_name"
                type="text"
                required
                value={formData.last_name}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                name="confirm_password"
                type="password"
                required
                value={formData.confirm_password}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Graduation Year
              </label>
              <input
                name="graduation_year"
                type="number"
                required
                value={formData.graduation_year}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                min="1900"
                max="2100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="CSE">Computer Science and Engineering</option>
                <option value="EEE">Electrical and Electronics Engineering</option>
                <option value="ECE">Electronics and Communication Engineering</option>
                <option value="AGRI">Agriculture</option>
              </select>
            </div>
          </div>

          <div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                loading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Creating account...' : 'Create account'}
            </motion.button>
          </div>
        </motion.form>
      </motion.div>
    </div>
  );
};

export default Register; 