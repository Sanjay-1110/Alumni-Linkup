import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing');
        return;
      }

      try {
        const response = await axios.get(`/api/auth/verify_email/?token=${token}`);
        setStatus('success');
        setMessage(response.data.message);
      } catch (error) {
        setStatus('error');
        setMessage(
          error.response?.data?.error || 'Failed to verify email. Please try again.'
        );
      }
    };

    verifyEmail();
  }, [searchParams]);

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
            Email Verification
          </motion.h2>
        </div>

        {status === 'verifying' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
            <p className="mt-4 text-gray-600">Verifying your email...</p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="mt-4 text-lg font-medium text-gray-900">{message}</p>
            <div className="mt-6">
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-500 font-medium"
              >
                Continue to login
              </Link>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <p className="mt-4 text-lg font-medium text-gray-900">{message}</p>
            <div className="mt-6">
              <Link
                to="/login"
                className="text-primary-600 hover:text-primary-500 font-medium"
              >
                Back to login
              </Link>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmail; 