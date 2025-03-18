import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosInstance from '../utils/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { FiPaperclip, FiImage, FiVideo, FiFile, FiX } from 'react-icons/fi';

const Messages = () => {
    const [conversations, setConversations] = useState([]);
    const [connectedUsers, setConnectedUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [socket, setSocket] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [showMediaMenu, setShowMediaMenu] = useState(false);
    const [attachedMedia, setAttachedMedia] = useState(null);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth() || { user: null };
    const lastMessageRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Handle automatic user selection from navigation
    useEffect(() => {
        if (location.state?.selectedUser) {
            setSelectedUser(location.state.selectedUser);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const fetchConnectedUsers = async () => {
        try {
            const response = await axiosInstance.get('/api/users/connections/');
            const users = response.data.map(conn => {
                const otherUser = conn.sender_details.id === user?.id ? conn.receiver_details : conn.sender_details;
                return {
                    id: otherUser.id,
                    username: otherUser.full_name,
                    email: otherUser.email,
                    profile_picture: otherUser.profile_pic
                };
            });
            setConnectedUsers(users);
        } catch (error) {
            console.error('Error fetching connected users:', error);
        }
    };

    const fetchConversations = async () => {
        const token = localStorage.getItem('access_token');
        
        if (!token) {
            toast.error('Please log in to view messages');
            navigate('/login');
            return;
        }
        
        try {
            const response = await axiosInstance.get('/api/messaging/conversations/');
            setConversations(response.data);
            
            if (location.state?.selectedUser) {
                const userConv = response.data.find(
                    conv => conv.other_user.id === location.state.selectedUser.id
                );
                if (userConv) {
                    handleSelectUser(userConv.other_user);
                } else if (location.state.selectedUser) {
                    // If no conversation exists but user was selected, show the user
                    handleSelectUser(location.state.selectedUser);
                }
            }
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error('Authentication error. Please log in again.');
                navigate('/login');
            } else {
                console.error('Failed to load conversations:', error);
                toast.error('Failed to load conversations');
            }
        }
    };

    // Fetch conversations and connected users
    useEffect(() => {
        fetchConversations();
        fetchConnectedUsers();
    }, [navigate, location.state]);

    // Periodically refresh conversations to ensure messages persist
    useEffect(() => {
        const refreshInterval = setInterval(() => {
            if (user?.id || localStorage.getItem('userId')) {
                fetchConversations();
                if (selectedUser) {
                    refreshMessages(selectedUser.id);
                }
            }
        }, 10000); // Refresh every 10 seconds
        
        return () => clearInterval(refreshInterval);
    }, [user, selectedUser]);

    const refreshMessages = async (userId) => {
        try {
            const response = await axiosInstance.get(`/api/messaging/messages/${userId}/`);
            setMessages(response.data);
        } catch (error) {
            console.error('Error refreshing messages:', error);
        }
    };

    // Connect to WebSocket when component mounts or when selecting a new user
    useEffect(() => {
        const connectWebSocket = async () => {
            const userId = user?.id || localStorage.getItem('userId');
            const token = localStorage.getItem('access_token');
            
            if (userId && token && !socket) {
                setIsConnecting(true);
                console.log('Connecting to WebSocket...');
                
                try {
                    const ws = new WebSocket(`ws://localhost:8000/ws/chat/${userId}/`);
                    
                    ws.onopen = () => {
                        console.log('WebSocket connection opened');
                        ws.send(JSON.stringify({
                            type: 'authenticate',
                            token: token
                        }));
                    };

                    ws.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            console.log('WebSocket message received:', data);
                            
                            if (data.error) {
                                toast.error(data.error);
                                console.error('WebSocket error message:', data.error);
                            } else if (data.type === 'authentication_successful') {
                                setIsConnecting(false);
                                console.log('WebSocket authentication successful');
                            } else if (data.type === 'message_sent') {
                                // Message confirmation received
                                console.log('Message sent confirmation received');
                                fetchConversations();
                            } else if (data.message && data.sender_id) {
                                // Incoming message from another user
                                console.log('Received message:', data);
                                
                                // Parse userId to ensure proper comparison
                                const parsedUserId = parseInt(userId, 10);
                                const parsedSenderId = parseInt(data.sender_id, 10);
                                
                                // Only add the message if it's not the one we just sent
                                if (lastMessageRef.current !== data.message) {
                                    setMessages(prev => [...prev, {
                                        content: data.message,
                                        message_type: data.message_type || 'text',
                                        media_url: data.media_url,
                                        media_type: data.media_type,
                                        timestamp: data.timestamp || new Date().toISOString(),
                                        is_sent_by_me: parsedSenderId === parsedUserId
                                    }]);
                                    fetchConversations();
                                }
                            }
                        } catch (error) {
                            console.error('Error processing WebSocket message:', error);
                        }
                    };

                    ws.onerror = (error) => {
                        console.error('WebSocket error:', error);
                        setIsConnecting(false);
                        toast.error('Connection error. Please try again.');
                    };

                    ws.onclose = (event) => {
                        console.log('WebSocket connection closed:', event);
                        setSocket(null);
                        setIsConnecting(false);
                        
                        // Clear any existing reconnect timeout
                        if (reconnectTimeoutRef.current) {
                            clearTimeout(reconnectTimeoutRef.current);
                        }
                        
                        // Don't show reconnection toast if component is unmounting
                        if (document.visibilityState !== 'hidden') {
                            toast.error('Connection lost. Reconnecting...');
                            // Try to reconnect after a delay
                            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
                        }
                    };

                    setSocket(ws);
                } catch (error) {
                    console.error('Error creating WebSocket connection:', error);
                    setIsConnecting(false);
                    toast.error('Failed to connect. Will retry shortly.');
                    
                    // Try to reconnect after a delay
                    reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
                }
            }
        };

        connectWebSocket();

        return () => {
            // Clean up WebSocket connection and timeout on unmount
            if (socket) {
                socket.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [user]);

    // Fetch messages when selecting a conversation
    const handleSelectUser = async (user) => {
        setSelectedUser(user);
        try {
            const response = await axiosInstance.get(`/api/messaging/messages/${user.id}/`);
            setMessages(response.data);
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error('Authentication error. Please log in again.');
                navigate('/login');
            } else if (error.response?.status === 403) {
                toast.error('You must be connected to this user to exchange messages.');
                setMessages([]);
            } else if (error.response?.status === 404) {
                setMessages([]);
            } else {
                console.error('Error loading messages:', error);
                toast.error('Failed to load messages. Please try again.');
                setMessages([]);
            }
        }
    };

    // Handle file selection without sending immediately
    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const maxSize = 10 * 1024 * 1024; // 10MB limit
        if (file.size > maxSize) {
            toast.error('File size should be less than 10MB');
            return;
        }

        // Determine media type
        let messageType = 'file';
        if (file.type.startsWith('image/')) messageType = 'image';
        else if (file.type.startsWith('video/')) messageType = 'video';
        else if (file.type === 'image/gif') messageType = 'gif';

        // Create a preview URL for images
        let previewUrl = null;
        if (messageType === 'image') {
            previewUrl = URL.createObjectURL(file);
        }

        // Store the file info to be sent later
        setAttachedMedia({
            file,
            messageType,
            mediaType: file.type,
            previewUrl
        });

        // Close the media menu
        setShowMediaMenu(false);
        
        // Reset file input
        event.target.value = '';
    };

    // Remove attached media
    const removeAttachedMedia = () => {
        if (attachedMedia?.previewUrl) {
            URL.revokeObjectURL(attachedMedia.previewUrl);
        }
        setAttachedMedia(null);
    };

    // Send message (with or without media)
    const handleSendMessage = async () => {
        if (!selectedUser || (!newMessage.trim() && !attachedMedia) || !socket || isConnecting || uploading) {
            return;
        }

        setUploading(true);
        try {
            // If there's attached media, upload it first
            if (attachedMedia) {
                const formData = new FormData();
                formData.append('media_file', attachedMedia.file);
                formData.append('recipient_id', selectedUser.id);
                formData.append('message_type', attachedMedia.messageType);
                formData.append('media_type', attachedMedia.mediaType);

                // Add text message as content if provided
                if (newMessage.trim()) {
                    formData.append('content', newMessage.trim());
                }

                const response = await axiosInstance.post('/api/messaging/upload-media/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                // Send the message through WebSocket
                socket.send(JSON.stringify({
                    message: newMessage.trim() || response.data.content,
                    recipient_id: selectedUser.id,
                    message_type: attachedMedia.messageType,
                    media_url: response.data.media_url,
                    media_type: attachedMedia.mediaType
                }));

                // Optimistically add message to UI
                setMessages(prev => [...prev, {
                    content: newMessage.trim() || response.data.content,
                    message_type: attachedMedia.messageType,
                    media_url: response.data.media_url,
                    media_type: attachedMedia.mediaType,
                    timestamp: new Date().toISOString(),
                    is_sent_by_me: true
                }]);

                // Clear the attached media
                removeAttachedMedia();
            } else {
                // Simple text message
                const messageContent = newMessage.trim();
                lastMessageRef.current = messageContent;

                socket.send(JSON.stringify({
                    message: messageContent,
                    recipient_id: selectedUser.id,
                    message_type: 'text'
                }));

                // Optimistically add message to UI
                setMessages(prev => [...prev, {
                    content: messageContent,
                    message_type: 'text',
                    timestamp: new Date().toISOString(),
                    is_sent_by_me: true
                }]);
            }

            // Clear message input
            setNewMessage('');
            
            // Refresh conversations to ensure the message appears in the list
            setTimeout(() => {
                fetchConversations();
            }, 1000);
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Conversations List */}
            <div className="w-1/3 bg-white border-r">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-semibold">Messages</h2>
                </div>
                <div className="overflow-y-auto h-[calc(100vh-73px)]">
                    {/* Show existing conversations */}
                    {conversations.map((conv) => (
                        <div
                            key={conv.id}
                            className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                                selectedUser?.id === conv.other_user.id ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => handleSelectUser(conv.other_user)}
                        >
                            <div className="flex items-center">
                                {conv.other_user.profile_picture ? (
                                    <img
                                        src={conv.other_user.profile_picture}
                                        alt={conv.other_user.username}
                                        className="w-10 h-10 rounded-full mr-3"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-300 mr-3 flex items-center justify-center">
                                        {conv.other_user.username[0].toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h3 className="font-semibold">{conv.other_user.username}</h3>
                                    {conv.last_message && (
                                        <p className="text-sm text-gray-600 truncate">
                                            {conv.last_message.content}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Show connected users who don't have conversations yet */}
                    {connectedUsers
                        .filter(user => !conversations.some(conv => conv.other_user.id === user.id))
                        .map((user) => (
                            <div
                                key={user.id}
                                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                                    selectedUser?.id === user.id ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => handleSelectUser(user)}
                            >
                                <div className="flex items-center">
                                    {user.profile_picture ? (
                                        <img
                                            src={user.profile_picture}
                                            alt={user.username}
                                            className="w-10 h-10 rounded-full mr-3"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gray-300 mr-3 flex items-center justify-center">
                                            {user.username[0].toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-semibold">{user.username}</h3>
                                        <p className="text-sm text-gray-600">Start a conversation</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
                {selectedUser ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b bg-white">
                            <div className="flex items-center">
                                {selectedUser.profile_picture ? (
                                    <img
                                        src={selectedUser.profile_picture}
                                        alt={selectedUser.username}
                                        className="w-10 h-10 rounded-full mr-3"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-300 mr-3 flex items-center justify-center">
                                        {selectedUser.username[0].toUpperCase()}
                                    </div>
                                )}
                                <h2 className="text-xl font-semibold">{selectedUser.username}</h2>
                                {isConnecting && (
                                    <span className="ml-2 text-sm text-gray-500">Connecting...</span>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                            <div className="space-y-4">
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${
                                            message.is_sent_by_me ? 'justify-end' : 'justify-start'
                                        }`}
                                    >
                                        <div
                                            className={`max-w-[70%] p-3 rounded-lg ${
                                                message.is_sent_by_me
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-white text-gray-900'
                                            }`}
                                        >
                                            {message.message_type === 'image' ? (
                                                <img
                                                    src={message.media_url}
                                                    alt="Image"
                                                    className="max-w-full rounded-lg"
                                                    onClick={() => window.open(message.media_url, '_blank')}
                                                />
                                            ) : message.message_type === 'video' ? (
                                                <video
                                                    controls
                                                    className="max-w-full rounded-lg"
                                                >
                                                    <source src={message.media_url} type={message.media_type} />
                                                    Your browser does not support the video tag.
                                                </video>
                                            ) : message.message_type === 'file' ? (
                                                <a
                                                    href={message.media_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center space-x-2 text-blue-500 hover:underline"
                                                >
                                                    <FiFile className="w-5 h-5" />
                                                    <span>Download File</span>
                                                </a>
                                            ) : (
                                                <p>{message.content}</p>
                                            )}
                                            <p className={`text-xs mt-1 ${
                                                message.is_sent_by_me ? 'text-primary-100' : 'text-gray-500'
                                            }`}>
                                                {new Date(message.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Message Input */}
                        <div className="p-4 bg-white border-t">
                            {/* Media preview (if any) */}
                            {attachedMedia && (
                                <div className="mb-2 p-2 border rounded bg-gray-50 flex items-center justify-between">
                                    <div className="flex items-center">
                                        {attachedMedia.messageType === 'image' && attachedMedia.previewUrl ? (
                                            <img 
                                                src={attachedMedia.previewUrl} 
                                                alt="Preview" 
                                                className="h-12 w-auto mr-2 rounded"
                                            />
                                        ) : attachedMedia.messageType === 'video' ? (
                                            <div className="flex items-center">
                                                <FiVideo className="w-5 h-5 text-green-500 mr-2" />
                                                <span className="text-sm text-gray-700">Video attached</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center">
                                                <FiFile className="w-5 h-5 text-purple-500 mr-2" />
                                                <span className="text-sm text-gray-700">{attachedMedia.file.name}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button 
                                        onClick={removeAttachedMedia}
                                        className="text-gray-500 hover:text-red-500"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                            
                            <div className="flex items-center space-x-2">
                                <div className="relative">
                                    <button
                                        onClick={() => setShowMediaMenu(!showMediaMenu)}
                                        className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                                        disabled={!!attachedMedia}
                                    >
                                        <FiPaperclip className={`w-5 h-5 ${attachedMedia ? 'opacity-50' : ''}`} />
                                    </button>
                                    {showMediaMenu && !attachedMedia && (
                                        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border p-2 w-48">
                                            <div className="space-y-2">
                                                <label className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                                                    <FiImage className="w-5 h-5 text-blue-500" />
                                                    <span>Image</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleFileSelect}
                                                        ref={fileInputRef}
                                                    />
                                                </label>
                                                <label className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                                                    <FiVideo className="w-5 h-5 text-green-500" />
                                                    <span>Video</span>
                                                    <input
                                                        type="file"
                                                        accept="video/*"
                                                        className="hidden"
                                                        onChange={handleFileSelect}
                                                    />
                                                </label>
                                                <label className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                                                    <FiFile className="w-5 h-5 text-purple-500" />
                                                    <span>File</span>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        onChange={handleFileSelect}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder={attachedMedia ? "Add a message (optional)" : "Type a message..."}
                                    className="flex-1 p-2 border rounded-l focus:outline-none focus:border-blue-500"
                                    disabled={isConnecting || uploading}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className={`px-4 py-2 text-white rounded-r focus:outline-none ${
                                        isConnecting || uploading
                                            ? 'bg-gray-400 cursor-not-allowed' 
                                            : 'bg-blue-500 hover:bg-blue-600'
                                    }`}
                                    disabled={isConnecting || uploading}
                                >
                                    {uploading ? 'Sending...' : 'Send'}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                        <p className="text-gray-500">Select a conversation to start messaging</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Messages; 