import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, User, ArrowRight, AlertCircle } from 'lucide-react';

export const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await register(email, password, fullName);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-6 relative overflow-hidden">
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-primary mx-auto flex items-center justify-center text-white font-bold shadow-elegant mb-3">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Create Account</h1>
          <p className="text-xs text-muted-foreground">Join your enterprise document workspace</p>
        </div>

        <div className="glow-card gradient-border p-8 rounded-3xl shadow-card">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3 text-destructive text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-display text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Sarah Connor"
                  className="input-premium pl-11"
                />
              </div>
            </div>

            <div>
              <label className="block font-display text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@enterprise.com"
                  className="input-premium pl-11"
                />
              </div>
            </div>

            <div>
              <label className="block font-display text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="input-premium pl-11"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full py-3.5 mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/80 text-center">
            <p className="text-xs text-muted-foreground">
              Already registered?{' '}
              <Link to="/login" className="text-primary hover:underline font-semibold transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

