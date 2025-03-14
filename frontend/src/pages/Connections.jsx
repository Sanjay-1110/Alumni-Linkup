import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const ConnectionCard = ({ connection, onAccept, onReject, onRemove, type }) => {
  const currentUserId = parseInt(localStorage.getItem('userId'));
  const user = type === 'request' ? connection.sender_details : 
    (connection.sender_details.id === currentUserId ? 
      connection.receiver_details : connection.sender_details);

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <img
          src={user.profile_pic || '/default-avatar.png'}
          alt={user.full_name}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div>
          <h3 className="font-medium text-gray-900">{user.full_name}</h3>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>
      
      {type === 'request' ? (
        <div className="flex space-x-2">
          <button
            onClick={() => onAccept(connection.id)}
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition"
          >
            Accept
          </button>
          <button
            onClick={() => onReject(connection.id)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          <span className="text-green-600 font-medium">Connected</span>
          <button
            onClick={() => onRemove(connection.id)}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

const Connections = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const response = await axios.get('/api/users/connections/requests/');
      setRequests(response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load connection requests');
    }
  };

  const fetchConnections = async () => {
    try {
      const response = await axios.get('/api/users/connections/');
      setConnections(response.data);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Failed to load connections');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRequests(), fetchConnections()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleAccept = async (connectionId) => {
    try {
      await axios.post(`/api/users/connections/handle/${connectionId}/`, {
        action: 'accept'
      });
      toast.success('Connection request accepted');
      await Promise.all([fetchRequests(), fetchConnections()]);
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Failed to accept connection request');
    }
  };

  const handleReject = async (connectionId) => {
    try {
      await axios.post(`/api/users/connections/handle/${connectionId}/`, {
        action: 'reject'
      });
      toast.success('Connection request rejected');
      await fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject connection request');
    }
  };

  const handleRemoveConnection = async (connectionId) => {
    try {
      await axios.post(`/api/users/connections/remove/${connectionId}/`);
      toast.success('Connection removed successfully');
      await fetchConnections();
    } catch (error) {
      console.error('Error removing connection:', error);
      toast.error('Failed to remove connection');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Connections</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('requests')}
              className={`${
                activeTab === 'requests'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
            >
              Requests {requests.length > 0 && `(${requests.length})`}
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              className={`${
                activeTab === 'connections'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
            >
              Connections {connections.length > 0 && `(${connections.length})`}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'requests' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {requests.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No pending connection requests
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {requests.map((request) => (
                        <ConnectionCard
                          key={request.id}
                          connection={request}
                          onAccept={handleAccept}
                          onReject={handleReject}
                          onRemove={handleRemoveConnection}
                          type="request"
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'connections' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {connections.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      No connections yet
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {connections.map((connection) => (
                        <ConnectionCard
                          key={connection.id}
                          connection={connection}
                          onRemove={handleRemoveConnection}
                          type="connection"
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Connections; 