import React from 'react';

export const StatCard = ({ title, value, subtext, icon: Icon, accentColor = 'primary' }) => {
  return (
    <div className="card-premium glow-card p-6 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <span className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</span>
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div>
        <div className="font-display text-3xl font-bold text-foreground tracking-tight mb-1">{value}</div>
        <p className="text-xs text-muted-foreground font-medium">{subtext}</p>
      </div>
    </div>
  );
};
