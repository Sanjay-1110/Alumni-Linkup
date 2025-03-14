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
    className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    onClick={() => window.location.href = `/dashboard/profile/${user.id}`}
  >
    <div className="flex items-center space-x-4">
      <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
        {user.profile_pic ? (
          <img
            src={user.profile_pic.startsWith('http') ? user.profile_pic : `http://localhost:8000${user.profile_pic}`}
            alt={`${user.first_name} ${user.last_name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-2xl font-semibold text-primary-600">
            {user.first_name[0]}{user.last_name[0]}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          {user.first_name} {user.last_name}
        </h3>
        <p className="text-sm text-gray-600">{user.department}</p>
        <p className="text-sm text-gray-500">Batch of {user.graduation_year}</p>
      </div>
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
  const [graduationYear, setGraduationYear] = useState('');
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
      if (graduationYear) params.append('graduation_year', graduationYear);
      
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
    const debounceTimeout = setTimeout(() => {
      fetchNetworkData();
    }, 300); // Debounce search for better performance

    return () => clearTimeout(debounceTimeout);
  }, [searchTerm, graduationYear]);

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
        <div className="space-y-4">
          {/* Search Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Alumni
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Search will look through names and departments
            </p>
          </div>

          {/* Filters Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Graduation Year
            </label>
            <input
              type="number"
              placeholder="Enter graduation year"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
              className="w-full md:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              min="1900"
              max="2100"
            />
          </div>
        </div>
      </motion.div>

      {/* Results Sections */}
      {searchTerm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Search Results
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {networkData.filteredUsers.map(user => (
              <UserCard key={user.id} user={user} />
            ))}
          </div>
          {networkData.filteredUsers.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No results found for your search
            </p>
          )}
        </motion.div>
      )}

      {/* Rest of the existing sections */}
      {!searchTerm && (
        <>
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
        </>
      )}

      {/* Selected Department Users */}
      {selectedDepartment && networkData.departmentUsers[selectedDepartment.id] && !searchTerm && (
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
    </div>
  );
};

export default Networking; 