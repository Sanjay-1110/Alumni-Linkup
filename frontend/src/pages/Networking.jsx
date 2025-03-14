import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const departments = [
  { id: 'CSE', name: 'Computer Science and Engineering' },
  { id: 'EEE', name: 'Electrical and Electronics Engineering' },
  { id: 'ECE', name: 'Electronics and Communication Engineering' },
  { id: 'AGRI', name: 'Agriculture' },
];

const UserCard = ({ user }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-center space-x-4">
      <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
        <span className="text-2xl font-semibold text-primary-600">
          {user.first_name[0]}{user.last_name[0]}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          {user.first_name} {user.last_name}
        </h3>
        <p className="text-sm text-gray-600">{user.department}</p>
        <p className="text-sm text-gray-500">Batch of {user.graduation_year}</p>
      </div>
    </div>
    <div className="mt-4">
      <button className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition duration-200">
        Connect
      </button>
    </div>
  </motion.div>
);

const DepartmentCard = ({ department, onSelect, userCount }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    onClick={() => onSelect(department)}
  >
    <h3 className="text-lg font-semibold text-gray-900">{department.name}</h3>
    <p className="text-sm text-gray-600 mt-2">
      {userCount} alumni from {department.id}
    </p>
  </motion.div>
);

const Networking = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [filters, setFilters] = useState({
    department: '',
    graduationYear: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [networkData, setNetworkData] = useState({
    batchMates: [],
    departmentUsers: {},
    filteredUsers: []
  });

  // Fetch network data
  const fetchNetworkData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.department) params.append('department', filters.department);
      if (filters.graduationYear) params.append('graduation_year', filters.graduationYear);
      
      const response = await axios.get(`/api/auth/network/?${params}`);
      setNetworkData({
        batchMates: response.data.batch_mates,
        departmentUsers: response.data.department_users,
        filteredUsers: response.data.filtered_users
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch network data');
      console.error('Network fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchNetworkData();
  }, [searchTerm, filters.department, filters.graduationYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-xl shadow-lg mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search alumni by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Graduation Year"
              value={filters.graduationYear}
              onChange={(e) => setFilters(prev => ({ ...prev, graduationYear: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              min="1900"
              max="2100"
            />
          </div>
        </div>
      </motion.div>

      {/* Your Batch Section */}
      {networkData.batchMates.length > 0 && (
        <section className="mb-12">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold text-gray-900 mb-6"
          >
            Your Batch ({user?.graduation_year})
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {networkData.batchMates.map(user => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        </section>
      )}

      {/* Departments Section */}
      <section className="mb-12">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-2xl font-bold text-gray-900 mb-6"
        >
          Browse by Department
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map(dept => (
            <DepartmentCard
              key={dept.id}
              department={dept}
              onSelect={setSelectedDepartment}
              userCount={networkData.departmentUsers[dept.id]?.length || 0}
            />
          ))}
        </div>
      </section>

      {/* Selected Department Users */}
      {selectedDepartment && networkData.departmentUsers[selectedDepartment.id] && (
        <section className="mb-12">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold text-gray-900 mb-6"
          >
            {selectedDepartment.name} Alumni
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {networkData.departmentUsers[selectedDepartment.id].map(user => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        </section>
      )}

      {/* Filtered Users */}
      {(searchTerm || filters.department || filters.graduationYear) && (
        <section className="mb-12">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold text-gray-900 mb-6"
          >
            Search Results
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {networkData.filteredUsers.map(user => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Networking; 