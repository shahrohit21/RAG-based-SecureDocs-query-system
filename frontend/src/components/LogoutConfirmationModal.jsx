import React from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';

export const LogoutConfirmationModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card gradient-border p-6 rounded-3xl w-full max-w-md shadow-card relative overflow-hidden space-y-5">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shrink-0">
            <LogOut className="w-6 h-6" />
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-display text-lg font-bold text-foreground">Sign Out Confirmation</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to sign out of your account? You will need to sign in again to access your encrypted document workspace.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost text-xs py-2 px-4 font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
