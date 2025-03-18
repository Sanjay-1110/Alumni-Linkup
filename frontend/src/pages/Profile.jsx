import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FiEdit2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState({});
  const [editedData, setEditedData] = useState({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [connectionId, setConnectionId] = useState(null);

  const isOwnProfile = !userId || userId === currentUser?.id?.toString();

  const fetchConnectionStatus = async () => {
    if (!isOwnProfile) {
      try {
        // Check both connections and pending requests
        const [connectionsResponse, requestsResponse] = await Promise.all([
          axios.get('/api/users/connections/'),
          axios.get('/api/users/connections/requests/')
        ]);

        // First check accepted connections
        const connection = connectionsResponse.data.find(
          conn => 
            (conn.sender.id === currentUser.id && conn.receiver.id === parseInt(userId)) ||
            (conn.receiver.id === currentUser.id && conn.sender.id === parseInt(userId))
        );
        
        if (connection) {
          setConnectionStatus('ACCEPTED');
          setConnectionId(connection.id);
          return;
        }

        // Then check pending requests
        const pendingRequest = requestsResponse.data.find(
          conn => 
            (conn.sender.id === currentUser.id && conn.receiver.id === parseInt(userId)) ||
            (conn.receiver.id === currentUser.id && conn.sender.id === parseInt(userId))
        );

        if (pendingRequest) {
          setConnectionStatus('PENDING');
          setConnectionId(pendingRequest.id);
        } else {
          setConnectionStatus(null);
          setConnectionId(null);
        }
      } catch (err) {
        console.error('Error fetching connection status:', err);
      }
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  // Add a new useEffect to periodically check connection status
  useEffect(() => {
    if (!isOwnProfile) {
      fetchConnectionStatus();
      // Check every 5 seconds for connection status updates
      const interval = setInterval(fetchConnectionStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [userId, currentUser?.id, isOwnProfile]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/auth/${userId || currentUser.id}/profile/`);
      
      // Ensure profile_pic has complete URL if it exists
      if (response.data.profile_pic && !response.data.profile_pic.startsWith('http')) {
        response.data.profile_pic = `http://localhost:8000${response.data.profile_pic}`;
      }
      
      setUser(response.data);
      setIsFollowing(response.data.is_followed_by_current_user);
      setEditedData(response.data);
      await fetchConnectionStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field) => {
    if (isOwnProfile) {
      setIsEditing(prev => ({ ...prev, [field]: true }));
      setEditedData(prev => ({ ...prev, [field]: user[field] || '' }));
    }
  };

  const handleSave = async (field) => {
    try {
      let data;
      let config = {};
      
      if (field === 'profile_pic' && profileImage) {
        data = new FormData();
        data.append('profile_pic', profileImage);
        config.headers = { 'Content-Type': 'multipart/form-data' };
      } else {
        data = { [field]: editedData[field] };
        config.headers = { 'Content-Type': 'application/json' };
      }

      const response = await axios.patch(
        `/api/auth/${currentUser.id}/profile/`,
        field === 'profile_pic' ? data : data,
        config
      );

      setUser(response.data);
      setEditedData(prev => ({ ...prev, ...response.data }));
      setIsEditing(prev => ({ ...prev, [field]: false }));
      
      if (field === 'profile_pic') {
        setProfileImage(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleConnect = async () => {
    try {
      if (!connectionStatus) {
        const response = await axios.post(`/api/users/connections/send/${userId}/`);
        setConnectionStatus('PENDING');
        toast.success('Connection request sent!');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send connection request');
    }
  };

  const handleRemoveConnection = async () => {
    try {
      if (connectionId) {
        await axios.post(`/api/users/connections/remove/${connectionId}/`);
        setConnectionStatus(null);
        setConnectionId(null);
        toast.success('Connection removed successfully');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove connection');
    }
  };

  const handleImageChange = async (e) => {
    if (e.target.files[0]) {
      setProfileImage(e.target.files[0]);
      const data = new FormData();
      data.append('profile_pic', e.target.files[0]);
      
      try {
        const response = await axios.patch(
          `/api/auth/${currentUser.id}/profile/`,
          data,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        // Ensure we have the complete URL by prepending the API base URL if needed
        const profilePicUrl = response.data.profile_pic.startsWith('http') 
          ? response.data.profile_pic 
          : `${window.location.origin}${response.data.profile_pic}`;
        
        const updatedData = {
          ...response.data,
          profile_pic: profilePicUrl + '?t=' + new Date().getTime()
        };
        setUser(updatedData);
        setEditedData(prev => ({ ...prev, ...updatedData }));
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to update profile picture');
      }
    }
  };

  const handleMessageUser = () => {
    navigate('/dashboard/messages', { state: { selectedUser: user } });
  };

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
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      </div>
    );
  }

  const EditableField = ({ label, field, type = 'text' }) => {
    const fieldValue = editedData[field] || '';
    
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-700">{label}</h3>
          {isOwnProfile && (
            <button
              onClick={() => handleEdit(field)}
              className="text-primary-600 hover:text-primary-700"
            >
              <FiEdit2 className="w-5 h-5" />
            </button>
          )}
        </div>
        {isEditing[field] ? (
          <div className="flex gap-2">
            <input
              type={type}
              defaultValue={fieldValue}
              onChange={(e) => {
                const value = e.target.value;
                setEditedData(prev => ({ ...prev, [field]: value }));
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
            <button
              onClick={() => handleSave(field)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Save
            </button>
          </div>
        ) : (
          <p className="text-gray-600">{user[field] || `No ${label.toLowerCase()} added`}</p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Profile Header */}
        <div className="relative h-48 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="absolute -bottom-16 left-8 flex items-end space-x-6">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white">
                {user.profile_pic ? (
                  <img
                    src={user.profile_pic}
                    alt={`${user.first_name}'s profile`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary-100 text-primary-600 text-3xl font-bold">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full cursor-pointer hover:bg-primary-700 transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <FiEdit2 className="w-4 h-4" />
                </label>
              )}
            </div>
            
            {/* Name and Actions */}
            <div className="mb-4 flex items-center space-x-4">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {user.first_name} {user.last_name}
                </h1>
                <p className="text-primary-100">{user.email}</p>
              </div>
              
              {!isOwnProfile && (
                <div className="flex space-x-2">
                  {connectionStatus === 'ACCEPTED' ? (
                    <>
                      <button
                        onClick={handleMessageUser}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Message
                      </button>
                      <button
                        onClick={handleRemoveConnection}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Remove Connection
                      </button>
                    </>
                  ) : connectionStatus === 'PENDING' ? (
                    <button
                      disabled
                      className="px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed"
                    >
                      Connection Requested
                    </button>
                  ) : (
                    <button
                      onClick={handleConnect}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Connect
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rest of the profile content */}
        <div className="p-8 pt-20">
          <EditableField label="Bio" field="bio" />
          <EditableField label="Location" field="location" />
          <EditableField label="Company" field="company" />
          <EditableField label="Job Title" field="job_title" />
          <EditableField label="Skills" field="skills" />
          <EditableField label="Interests" field="interests" />
        </div>
      </div>
    </div>
  );
};

export default Profile; 