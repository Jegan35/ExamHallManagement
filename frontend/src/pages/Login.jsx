import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        user_id: userId,
        password: password,
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      localStorage.setItem('user_id', response.data.user_id);

      if (response.data.role === 'admin') navigate('/admin');
      else if (response.data.role === 'staff') navigate('/staff');
      else if (response.data.role === 'student') navigate('/student');
      
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Connection failed. Ensure backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-base">
      <div className="w-full max-w-md p-8 space-y-8 bg-panel rounded-sm shadow-2xl border border-gray-800">
        
        <div className="text-center">
          {/* Updated Title */}
          <h2 className="text-3xl font-black text-white tracking-widest uppercase">
            Exam<span className="text-accent">Management</span>
          </h2>
          <p className="mt-2 text-xs font-mono text-gray-400 uppercase tracking-widest">
            Institutional Allocation Protocol
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin} autoComplete="off">
          {error && (
            <div className="p-3 text-sm font-mono text-center text-alert bg-red-900/20 border border-alert rounded-sm">
              [ ERROR ]: {error}
            </div>
          )}
          
          <div className="space-y-4 font-mono">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">User ID</label>
              <input
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                // Prevents browser from suggesting old usernames
                autoComplete="off" 
                name="username"
                className="w-full px-4 py-3 text-gray-200 bg-base border border-gray-700 rounded-sm focus:ring-1 focus:ring-accent focus:outline-none focus:border-accent transition-all"
                placeholder="Enter ID"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                // Prevents "Weak Password" or "Change Password" popups
                autoComplete="new-password" 
                name="password"
                className="w-full px-4 py-3 text-gray-200 bg-base border border-gray-700 rounded-sm focus:ring-1 focus:ring-accent focus:outline-none focus:border-accent transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 px-4 font-bold text-base bg-accent text-black rounded-sm hover:bg-teal-400 focus:outline-none transition-all uppercase tracking-widest ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Authenticating...' : 'Initialize Session'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;