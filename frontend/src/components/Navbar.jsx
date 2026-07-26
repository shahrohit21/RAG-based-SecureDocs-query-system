import React from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';

export const Navbar = () => {
  const location = useLocation();

  const getPageTitle = (path) => {
    switch (path) {
      case '/':
        return { title: 'Dashboard Overview', desc: 'Enterprise document management and intelligence analytics' };
      case '/upload':
        return { title: 'Upload Document', desc: 'Securely upload and process your documents with automatic PII masking' };
      case '/documents':
        return { title: 'My Documents', desc: 'View, search, and manage your stored document repository' };
      case '/chat':
        return { title: 'AI Knowledge Assistant', desc: 'Ask questions and extract insights using context-aware RAG' };
      case '/profile':
        return { title: 'Profile & Security Settings', desc: 'Manage account credentials, role permissions, and tenant security' };
      default:
        return { title: 'SecureDoc AI', desc: 'Enterprise Document Intelligence Engine' };
    }
  };

  const { title, desc } = getPageTitle(location.pathname);

  return (
    <header className="h-20 glass-header px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-xl font-display font-bold text-foreground tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">{desc}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Encrypted Status Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/80 border border-border text-xs text-muted-foreground font-medium">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>AES-256 Encrypted</span>
        </div>

        {/* PII Masking / Protection Badge */}
        <div className="badge badge-info px-3.5 py-1.5 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>PII Masking Active</span>
        </div>
      </div>
    </header>
  );
};

