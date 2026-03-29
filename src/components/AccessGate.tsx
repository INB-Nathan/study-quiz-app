'use client';

import { useState, useEffect, ReactNode } from 'react';

interface AccessGateProps {
  children: ReactNode;
}

export default function AccessGate({ children }: AccessGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('study_access_key');
    if (stored) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });

      const data = await res.json();

      if (data.valid) {
        sessionStorage.setItem('study_access_key', key);
        setIsAuthenticated(true);
      } else {
        setError('Invalid access key');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Study Quiz</h1>
            <p className="text-gray-400">Enter your access key to begin</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Access Key"
                className="w-full px-4 py-3 bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#22d3ee] focus:border-transparent text-center text-lg tracking-widest"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !key.trim()}
              className="w-full min-h-[44px] min-w-[44px] py-3 px-4 bg-[#22d3ee] hover:bg-[#06b6d4] disabled:bg-gray-700 disabled:cursor-not-allowed text-[#0f0f0f] font-semibold rounded-xl transition-colors"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
