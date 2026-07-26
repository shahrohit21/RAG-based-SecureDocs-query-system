import React from 'react';
import { X, FileText, ShieldCheck, FileCheck } from 'lucide-react';

export const DocumentModal = ({ isOpen, onClose, documentContent, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-card overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground truncate max-w-md">
                {documentContent?.filename || 'Document Content Preview'}
              </h3>
              <p className="text-xs text-primary flex items-center gap-1.5 mt-0.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Sensitive PII Masked & Secured
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
              <p className="text-sm font-medium">Loading document preview...</p>
            </div>
          ) : (
            <>
              {/* Metadata Pill */}
              <div className="p-3.5 rounded-xl bg-secondary/60 border border-border flex items-center gap-3">
                <FileCheck className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="font-display text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Document Status</span>
                  <p className="text-xs font-semibold text-foreground">Indexed & Ready for RAG Queries</p>
                </div>
              </div>

              {/* Text Box */}
              <div>
                <label className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Document Preview
                </label>
                <div className="p-4 rounded-xl bg-card border border-border font-sans text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                  {documentContent?.masked_preview || 'No preview content available.'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="btn-ghost px-5 py-2 text-sm font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

