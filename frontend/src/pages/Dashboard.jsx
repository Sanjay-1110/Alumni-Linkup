import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-white rounded-2xl shadow-lg p-8"
        >
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold text-gray-900 mb-6"
          >
            Welcome, {user?.first_name || 'User'}!
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* Quick Stats */}
            <div className="bg-primary-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-primary-900 mb-2">Your Profile</h3>
              <p className="text-primary-600">
                Department: {user?.department || 'Not set'}
                <br />
                Graduation Year: {user?.graduation_year || 'Not set'}
              </p>
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recent Activity</h3>
              <p className="text-gray-600">No recent activity to show.</p>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition duration-200">
                  Update Profile
                </button>
                <button className="w-full py-2 px-4 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition duration-200">
                  View Network
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default Dashboard; 