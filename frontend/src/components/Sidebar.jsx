import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { LogoutConfirmationModal } from './LogoutConfirmationModal';
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  MessageSquare,
  User,
  LogOut,
  ShieldCheck,
  Settings,
  Zap,
} from 'lucide-react';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleConfirmLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Upload Document', path: '/upload', icon: UploadCloud },
    { name: 'My Documents', path: '/documents', icon: FileText },
    { name: 'AI Assistant', path: '/chat', icon: MessageSquare },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <>
      <aside className="w-64 glass-sidebar flex flex-col h-screen sticky top-0 z-30 select-none">
        {/* Brand Header */}
        <div className="p-6 border-b border-border/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold shadow-elegant shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-foreground tracking-tight leading-none flex items-center gap-1.5">
              SecureDoc <span className="text-primary font-extrabold">RAG</span>
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 mt-1 inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary eyebrow-dot-pulse" />
              Encrypted Workspace
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto" aria-label="Main sidebar navigation">
          <div className="px-3 pb-2 font-display text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Navigation Menu
          </div>
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={`${item.path}-${idx}`}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-display text-sm font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold border border-primary/20 shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-pill"
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                    <span>{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer User Info & Logout */}
        <div className="p-4 border-t border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center font-display font-bold text-xs text-primary uppercase shrink-0">
              {user?.email?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-display font-semibold text-foreground truncate">{user?.full_name || 'User'}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            title="Sign out"
            className="btn-ghost p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <LogoutConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
};

