import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

// Post creation component
const CreatePostForm = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [image, setImage] = useState(null);
  const [postType, setPostType] = useState('TEXT');
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Post content is required');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    const formData = new FormData();
    formData.append('content', content);
    formData.append('title', title);
    formData.append('post_type', postType);
    formData.append('is_public', isPublic);
    
    if (image) {
      formData.append('image', image);
    }
    
    try {
      const response = await axios.post('/api/posts/posts/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      setContent('');
      setTitle('');
      setImage(null);
      setPostType('TEXT');
      
      if (onPostCreated) {
        onPostCreated(response.data);
      }
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-xl shadow-lg mb-6"
    >
      <h2 className="text-xl font-semibold mb-4">Create a Post</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-500 rounded-lg">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        
        <div className="mb-4">
          <textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          ></textarea>
        </div>
        
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <label className="inline-flex items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="sr-only"
              />
              <span className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
                {image ? 'Change Image' : 'Add Image'}
              </span>
            </label>
            
            {image && (
              <span className="text-sm text-gray-500">
                {image.name}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="form-checkbox h-5 w-5 text-primary-600"
              />
              <span className="ml-2 text-gray-700">Public post</span>
            </label>
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

// Comments section component
const CommentsSection = ({ post }) => {
  // Add null check to prevent errors
  if (!post) {
    return null;
  }
  
  const [comments, setComments] = useState(post.top_comments || []);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await axios.post('/api/posts/comments/', {
        post: post.id,
        content: newComment,
      });
      
      setComments([...comments, response.data]);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setError(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadAllComments = async () => {
    try {
      const response = await axios.get(`/api/posts/comments/?post_id=${post.id}`);
      setComments(response.data);
      setShowAllComments(true);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError('Failed to load comments');
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      {/* Comment list */}
      {comments.length > 0 ? (
        <div className="space-y-3 mb-4">
          {comments.map((comment) => (
            // Ensure each comment has proper key
            <div key={comment?.id || Math.random().toString(36).substr(2, 9)} className="flex space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                {comment.author?.profile_pic ? (
                  <img
                    src={comment.author.profile_pic.startsWith('http') 
                      ? comment.author.profile_pic 
                      : `http://localhost:8000${comment.author.profile_pic}`}
                    alt={`${comment.author?.first_name || ''} ${comment.author?.last_name || ''}`}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-semibold text-gray-600">
                    {comment.author?.first_name?.[0]}{comment.author?.last_name?.[0]}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-sm font-medium text-gray-800">
                    {comment.author?.first_name || ''} {comment.author?.last_name || ''}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {comment.content}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {comment.created_at && formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-4">No comments yet</p>
      )}
      
      {/* Show more comments button */}
      {post.comments_count > comments.length && !showAllComments && (
        <button
          onClick={loadAllComments}
          className="text-sm text-primary-600 hover:text-primary-700 mb-4"
        >
          View all {post.comments_count} comments
        </button>
      )}
      
      {/* Comment form */}
      <form onSubmit={handleSubmitComment} className="flex space-x-2">
        <input
          type="text"
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={isSubmitting || !newComment.trim()}
          className={`px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors ${
            isSubmitting || !newComment.trim() ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          Post
        </button>
      </form>
      
      {error && (
        <p className="mt-2 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};

// Post card component
const PostCard = ({ post, onLike }) => {
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const { user } = useAuth();
  
  // Add null check to prevent errors with undefined post data
  if (!post || !post.author) {
    return null; // Don't render posts with missing data
  }
  
  const handleLike = async () => {
    try {
      await axios.post('/api/posts/likes/', {
        post: post.id,
      });
      
      if (onLike) {
        onLike(post.id);
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow mb-6"
    >
      {/* Post header */}
      <div className="flex items-center space-x-3 mb-4">
        <Link to={`/dashboard/profile/${post.author.id}`} className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
            {post.author.profile_pic ? (
              <img
                src={post.author.profile_pic.startsWith('http') 
                  ? post.author.profile_pic 
                  : `http://localhost:8000${post.author.profile_pic}`}
                alt={`${post.author.first_name || ''} ${post.author.last_name || ''}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-lg font-semibold text-primary-600">
                {post.author.first_name?.[0]}{post.author.last_name?.[0]}
              </span>
            )}
          </div>
        </Link>
        <div>
          <Link 
            to={`/dashboard/profile/${post.author.id}`}
            className="font-medium text-gray-900 hover:text-primary-600 transition-colors"
          >
            {post.author.first_name || ''} {post.author.last_name || ''}
          </Link>
          <p className="text-xs text-gray-500">
            {post.created_at && formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>
      
      {/* Post title */}
      {post.title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
      )}
      
      {/* Post content */}
      <p className="text-gray-700 mb-4 whitespace-pre-line">{post.content || ''}</p>
      
      {/* Post image if present */}
      {post.image && (
        <div className="mb-4 rounded-lg overflow-hidden">
          <img
            src={typeof post.image === 'string' && post.image.startsWith('http') ? post.image : `http://localhost:8000${post.image}`}
            alt="Post attachment"
            className="w-full object-cover"
          />
        </div>
      )}
      
      {/* Post stats */}
      <div className="flex items-center text-sm text-gray-500 mb-4">
        <div className="mr-4">
          <span>{post.likes_count || 0}</span>
          <span className="ml-1">likes</span>
        </div>
        <div>
          <span>{post.comments_count || 0}</span>
          <span className="ml-1">comments</span>
        </div>
      </div>
      
      {/* Post actions */}
      <div className="flex border-t border-b border-gray-100 py-2">
        <button
          onClick={handleLike}
          className={`flex items-center justify-center w-1/2 py-2 rounded-md transition-colors ${
            post.liked_by_user ? 'text-primary-600 font-medium' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <svg
            className={`w-5 h-5 mr-2 ${post.liked_by_user ? 'text-primary-600' : 'text-gray-500'}`}
            fill={post.liked_by_user ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          Like
        </button>
        <button
          onClick={() => setIsCommentsOpen(!isCommentsOpen)}
          className="flex items-center justify-center w-1/2 py-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Comment
        </button>
      </div>
      
      {/* Comments section */}
      {isCommentsOpen && (
        <CommentsSection post={post} />
      )}
    </motion.div>
  );
};

// Main Feed component
const Feed = () => {
  const { user } = useAuth();
  const [feedType, setFeedType] = useState('all'); // all, following, trending
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch posts based on feed type
  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let endpoint = '/api/posts/posts/';
      
      if (feedType === 'following') {
        endpoint = '/api/posts/posts/user_feed/';
      } else if (feedType === 'trending') {
        endpoint = '/api/posts/posts/trending/';
      }
      
      console.log('Fetching posts from:', endpoint);
      const response = await axios.get(endpoint);
      
      // Validate response data
      if (response.data && Array.isArray(response.data)) {
        // Filter out any posts with missing critical data
        const validPosts = response.data.filter(post => post && post.id && post.author);
        console.log('Valid posts:', validPosts.length);
        setPosts(validPosts);
      } else {
        console.error('Invalid response format from API:', response.data);
        setPosts([]);
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts. Please try again.');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on component mount and when feed type changes
  useEffect(() => {
    fetchPosts();
  }, [feedType]);

  // Handle post creation
  const handlePostCreated = (newPost) => {
    if (newPost && newPost.id) {
      setPosts([newPost, ...posts]);
    }
  };

  // Handle post like
  const handlePostLike = (postId) => {
    if (!postId) return;
    
    setPosts(
      posts.map((post) => 
        post.id === postId
          ? {
              ...post,
              liked_by_user: !post.liked_by_user,
              likes_count: post.liked_by_user
                ? Math.max(0, (post.likes_count || 0) - 1)
                : (post.likes_count || 0) + 1,
            }
          : post
      )
    );
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Feed</h1>
      
      {/* Feed type tabs */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setFeedType('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              feedType === 'all'
                ? 'bg-primary-50 text-primary-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Posts
          </button>
          <button
            onClick={() => setFeedType('following')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              feedType === 'following'
                ? 'bg-primary-50 text-primary-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Following
          </button>
          <button
            onClick={() => setFeedType('trending')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              feedType === 'trending'
                ? 'bg-primary-50 text-primary-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Trending
          </button>
        </div>
      </div>
      
      {/* Create post form */}
      <CreatePostForm onPostCreated={handlePostCreated} />
      
      {/* Loading state */}
      {loading && (
        <div className="bg-white p-6 rounded-xl shadow-sm text-center my-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
          </div>
          <p className="text-gray-500 mt-2">Loading posts...</p>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          <p>{error}</p>
          <button 
            onClick={fetchPosts}
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Posts list */}
      {!loading && posts.length > 0 ? (
        <div>
          {posts.map((post) => (
            post && post.id ? (
              <PostCard
                key={post.id}
                post={post}
                onLike={handlePostLike}
              />
            ) : null
          ))}
        </div>
      ) : (!loading && !error && (
        <div className="bg-white p-6 rounded-xl shadow-sm text-center">
          <p className="text-gray-500">
            {feedType === 'following'
              ? 'Follow more people to see their posts in your feed!'
              : feedType === 'trending'
              ? 'No trending posts yet. Check back soon!'
              : 'No posts yet. Be the first to post!'}
          </p>
        </div>
      ))}
    </div>
  );
};

export default Feed; 