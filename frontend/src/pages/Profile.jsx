import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { analyticsApi } from '../api/analyticsApi';
import { LogoutConfirmationModal } from '../components/LogoutConfirmationModal';
import {
  User,
  ShieldCheck,
  LogOut,
  Mail,
  Calendar,
  FileText,
  MessageSquare,
  HardDrive,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: analyticsApi.getStats,
  });

  const handleConfirmLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
        {/* Profile Banner */}
        <div className="glass-card p-8 rounded-3xl flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary font-display font-bold text-3xl shadow-elegant shrink-0">
            {user?.full_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="font-display text-2xl font-bold text-foreground">{user?.full_name || 'Enterprise User'}</h2>
              <span className="badge badge-info text-[10px] uppercase">
                <ShieldCheck className="w-3 h-3" />
                Verified Account
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">{user?.email}</p>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="btn-ghost text-xs py-2.5 px-4 text-destructive hover:bg-destructive/10 hover:border-destructive/30 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Profile Details & Usage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Details */}
          <div className="card-premium p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground text-base">Account Profile</h3>
                <p className="text-xs text-muted-foreground">User identity details</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-muted-foreground font-medium block mb-1">Full Name</span>
                <div className="p-3 rounded-xl bg-secondary/50 border border-border font-medium text-foreground flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>{user?.full_name || 'Not provided'}</span>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground font-medium block mb-1">Email Address</span>
                <div className="p-3 rounded-xl bg-secondary/50 border border-border font-medium text-foreground flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  <span>{user?.email}</span>
                </div>
              </div>

              <div>
                <span className="text-muted-foreground font-medium block mb-1">Account Role</span>
                <div className="p-3 rounded-xl bg-secondary/50 border border-border font-medium text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span className="capitalize">{user?.role || 'User'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="card-premium p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-foreground text-base">Workspace Usage</h3>
                <p className="text-xs text-muted-foreground">Resource & document metrics</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border flex items-center justify-between">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" /> Documents Indexed
                </span>
                <span className="text-foreground font-bold font-display">{stats?.total_documents || 0}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border flex items-center justify-between">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" /> Questions Asked
                </span>
                <span className="text-foreground font-bold font-display">{stats?.total_queries || 0}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border flex items-center justify-between">
                <span className="text-muted-foreground font-medium flex items-center gap-2">
                  <HardDrive className="text-muted-foreground w-3.5 h-3.5" /> Storage Used
                </span>
                <span className="text-primary font-bold font-mono">{stats?.storage_used_mb || 0} MB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
};
