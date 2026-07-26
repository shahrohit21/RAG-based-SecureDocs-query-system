import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analyticsApi } from '../api/analyticsApi';
import { StatCard } from '../components/StatCard';
import {
  FileText,
  MessageSquare,
  HardDrive,
  ShieldCheck,
  UploadCloud,
  ArrowRight,
  Activity,
  Lock,
  Clock,
  Sparkles,
} from 'lucide-react';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: analyticsApi.getStats,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium">Loading workspace analytics...</p>
      </div>
    );
  }

  const formatActivityAction = (action) => {
    switch (action) {
      case 'DOC_UPLOAD':
        return 'Uploaded document';
      case 'QUERY_EXECUTE':
        return 'Asked question';
      case 'USER_LOGON':
        return 'Signed in';
      case 'USER_REGISTER':
        return 'Account created';
      case 'DOC_DELETE':
        return 'Deleted document';
      default:
        return action || 'Activity logged';
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-hero glow-card gradient-border p-8 rounded-3xl border shadow-card relative overflow-hidden">
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="badge badge-info text-xs font-semibold px-3 py-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Protected Enterprise Workspace</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            Welcome back, {user?.full_name || 'User'}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Query your confidential documents securely with real-time PII masking and vector retrieval.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/upload')}
              className="btn-primary flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
            <button
              onClick={() => navigate('/chat')}
              className="btn-ghost flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Open AI Assistant</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="My Documents"
          value={stats?.total_documents || 0}
          subtext="Active indexed documents"
          icon={FileText}
          accentColor="primary"
        />
        <StatCard
          title="Questions Asked"
          value={stats?.total_queries || 0}
          subtext="Total AI RAG interactions"
          icon={MessageSquare}
          accentColor="primary"
        />
        <StatCard
          title="Storage"
          value={`${stats?.storage_used_mb || 0} MB`}
          subtext="Used capacity"
          icon={HardDrive}
          accentColor="primary"
        />
        <StatCard
          title="Security Status"
          value="Protected"
          subtext="PII Masking & RBAC active"
          icon={ShieldCheck}
          accentColor="primary"
        />
      </div>

      {/* Recent Activity Section */}
      <div className="card-premium p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-base">Recent Activity</h3>
              <p className="text-xs text-muted-foreground">Latest events in your tenant workspace</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/documents')}
            className="btn-ghost text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <span>View Documents</span> <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2.5">
          {stats?.recent_activity?.length > 0 ? (
            stats.recent_activity.map((act) => (
              <div
                key={act.id}
                className="p-3.5 rounded-xl bg-secondary/50 border border-border flex items-center justify-between text-xs transition-colors hover:bg-secondary/80"
              >
                <div className="flex items-center gap-3">
                  <span className="badge badge-info text-[11px] font-semibold">
                    {formatActivityAction(act.action)}
                  </span>
                  <span className="text-foreground font-medium">
                    {act.details?.filename || act.details?.question_preview || 'Action executed'}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-muted-foreground text-xs">
              No recent activity recorded yet. Upload your first document to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

