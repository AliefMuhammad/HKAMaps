import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Map, AlertCircle, Loader2, ShieldCheck, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface-100 relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-hka-red/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md p-8 bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-hka-red rounded-2xl flex items-center justify-center shadow-lg shadow-hka-red/30 mb-4 transform -rotate-6 hover:rotate-0 transition-transform">
            <Map className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-surface-800 tracking-tight">HKA MAPS</h1>
          <p className="text-sm text-surface-500 mt-2 font-medium text-center">
            Monitoring Aset & Kerusakan Tol Terintegrasi AI
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-xl flex items-center gap-2 border border-red-100 animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">Email / Username</label>
            <div className="relative">
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-surface-800 focus:outline-none focus:ring-2 focus:ring-hka-red/50 focus:border-hka-red transition-all"
                placeholder="admin@hka.co.id"
                required
              />
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-surface-700 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-surface-50 border border-surface-200 rounded-xl text-surface-800 focus:outline-none focus:ring-2 focus:ring-hka-red/50 focus:border-hka-red transition-all"
                placeholder="••••••••"
                required
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={18} />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 bg-hka-red hover:bg-hka-red/90 text-white font-bold rounded-xl shadow-lg shadow-hka-red/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <><Loader2 size={18} className="animate-spin" /> Memproses...</>
            ) : (
              'Masuk ke Sistem'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-surface-100">
          <div className="bg-surface-50 rounded-xl p-4 text-xs text-surface-600">
            <p className="font-bold text-surface-800 mb-1">Dummy Accounts:</p>
            <div className="flex justify-between items-center py-1 border-b border-surface-200/60">
              <span>Admin: <code className="bg-surface-200 px-1 py-0.5 rounded">admin@hka.co.id</code></span>
              <span className="font-mono text-surface-500">admin</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>User: <code className="bg-surface-200 px-1 py-0.5 rounded">user@hka.co.id</code></span>
              <span className="font-mono text-surface-500">user</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-6 text-xs text-surface-400 font-medium tracking-wide">
        &copy; 2026 PT Hakaaston. All rights reserved.
      </div>
    </div>
  );
}
