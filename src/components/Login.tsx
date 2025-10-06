import React, { useState, useEffect } from 'react';
import FacilitronOrb from './FacilitronOrb';

interface LoginProps {
  onSuccess: () => void;
}

const STATIC_PASSCODE = '2468';

export default function Login({ onSuccess }: LoginProps) {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // no-op: legacy cleanup
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (passcode === STATIC_PASSCODE) {
      localStorage.setItem('facilitron-authed', 'true');
      onSuccess();
      return;
    }

    setError('Invalid credentials');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow border border-gray-300 p-6">
        <div className="mb-4 text-center flex flex-col items-center gap-2">
          {/* <FacilitronOrb size={28} /> */}
          <h1 className="text-xl font-semibold font-mono text-gray-900">Facilitron</h1>
          <p className="text-sm text-gray-600">Enter passcode to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            {/* <label className="block text-sm font-medium text-gray-800 mb-1">Passcode</label> */}
            <input
              type="password"
              inputMode="numeric"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder={"Enter passcode to continue"}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              required
            />
          </div>
          {error && (
            <p className="text-sm text-gray-800">{error}</p>
          )}
          <button
            type="submit"
            className="w-full px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 transition-colors"
          >
            Enter
          </button>
          {/* <div className="text-xs text-gray-500 text-center">Demo: passcode shown in placeholder</div> */}
        </form>
      </div>
    </div>
  );
}


