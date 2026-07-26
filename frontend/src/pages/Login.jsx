import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, FileText } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid login credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6 relative overflow-hidden">
      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Logo & Heading */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary mx-auto flex items-center justify-center text-white font-bold shadow-elegant mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">SecureDoc RAG</h1>
          <p className="text-xs text-muted-foreground">Enterprise Document Intelligence Platform</p>
        </div>

        {/* Login Card */}
        <div className="glow-card gradient-border p-8 rounded-3xl shadow-card">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3 text-destructive text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block font-display text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="input-premium pl-11"
                />
              </div>
            </div>

            <div>
              <label className="block font-display text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-premium pl-11"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 pt-6 border-t border-border/80 text-center">
            <p className="text-xs text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-semibold transition-colors">
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground text-center">
          <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-center gap-2 font-medium">
            <FileText className="w-4 h-4 text-primary" />
            <span>Document RAG</span>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>PII Protection</span>
          </div>
        </div>
      </div>
    </div>
  );
};

