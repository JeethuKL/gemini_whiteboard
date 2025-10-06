import React, { useState, useEffect } from 'react';
import FacilitronOrb from './FacilitronOrb';

interface LoginProps {
  onSuccess: () => void;
}

const STATIC_EMAIL = 'sid@facilitron.com';  
const STATIC_PASSWORD = '12345678';

export default function Login({ onSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setEmail(localStorage.getItem('facilitron-last-email') || '');
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (email === STATIC_EMAIL && password === STATIC_PASSWORD) {
      localStorage.setItem('facilitron-authed', 'true');
      localStorage.setItem('facilitron-last-email', email);
      onSuccess();
      return;
    }

    setError('Invalid credentials');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="mb-4 text-center flex flex-col items-center gap-2">
          <FacilitronOrb size={28} />
          <h1 className="text-xl font-semibold text-gray-800">Facilitron</h1>
          <p className="text-sm text-gray-500">Sign in to facilitate</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={STATIC_EMAIL}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={STATIC_PASSWORD}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
          <div className="text-xs text-gray-400 text-center">
            Demo credentials are prefilled as placeholders
          </div>
        </form>
      </div>
    </div>
  );
}


