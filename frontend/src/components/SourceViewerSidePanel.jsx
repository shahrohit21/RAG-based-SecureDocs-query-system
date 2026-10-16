import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { documentApi } from '../api/documentApi';
import {
  X,
  FileText,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  FileCode,
  Layers,
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';

export const SourceViewerSidePanel = ({ isOpen, onClose, sourceChunk }) => {
  const [activeTab, setActiveTab] = useState('chunk'); // 'chunk' | 'document'
  const [copied, setCopied] = useState(false);

  // Fetch full document preview if document_id is present
  const docId = sourceChunk?.document_id;
  const { data: docContent, isLoading: isLoadingDoc } = useQuery({
    queryKey: ['documentContent', docId],
    queryFn: () => documentApi.viewDocumentContent(docId),
    enabled: isOpen && !!docId && activeTab === 'document',
    staleTime: 5 * 60 * 1000,
  });

  if (!isOpen || !sourceChunk) return null;

  const handleCopyChunk = () => {
    if (sourceChunk.content) {
      navigator.clipboard.writeText(sourceChunk.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const similarityPercent = sourceChunk.similarity_score
    ? Math.round(sourceChunk.similarity_score * 100)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="flex-1 cursor-pointer" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="w-full max-w-xl h-full bg-card border-l border-border shadow-2xl flex flex-col animate-slideLeft">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-sm font-bold text-foreground truncate">
                {sourceChunk.filename || 'Source Document'}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="badge badge-info text-[10px] py-0 px-2 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  PII Sanitized
                </span>
                {similarityPercent !== null && (
                  <span className="badge badge-success text-[10px] py-0 px-2 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {similarityPercent}% Similarity Match
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-ghost p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer shrink-0"
            title="Close Panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 border-b border-border/60 flex items-center gap-4 bg-secondary/10">
          <button
            onClick={() => setActiveTab('chunk')}
            className={`pb-2.5 font-display text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'chunk'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5" />
              <span>Cited Chunk Excerpt</span>
            </div>
            {activeTab === 'chunk' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('document')}
            className={`pb-2.5 font-display text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'document'
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Full Masked Document</span>
            </div>
            {activeTab === 'document' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>

        {/* Panel Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'chunk' ? (
            <div className="space-y-4 animate-fadeIn">
              {/* Citation Context Callout */}
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground/80 space-y-1">
                <div className="flex items-center gap-1.5 font-display font-semibold text-primary">
                  <Info className="w-3.5 h-3.5" />
                  <span>Grounding Context</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  This exact chunk was retrieved from your isolated vector repository (Pinecone / pgvector) to ground the AI response in verifiable facts.
                </p>
                <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-muted-foreground">
                  <span>Chunk Index: #{sourceChunk.chunk_index ?? 0}</span>
                  {sourceChunk.chunk_id && (
                    <span className="truncate max-w-[200px]">ID: {sourceChunk.chunk_id}</span>
                  )}
                </div>
              </div>

              {/* Chunk Content Card */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-display text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Retrieved Text Chunk
                  </label>
                  <button
                    onClick={handleCopyChunk}
                    className="btn-ghost py-1 px-2.5 text-xs font-medium flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-success" />
                        <span className="text-success text-[11px] font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[11px]">Copy Chunk</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-secondary/40 border border-border text-foreground text-xs font-mono leading-relaxed whitespace-pre-wrap select-text">
                  {sourceChunk.content || 'No chunk text available.'}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              {isLoadingDoc ? (
                <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
                  <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
                  <p className="text-xs font-medium">Loading full document preview...</p>
                </div>
              ) : docContent ? (
                <div className="space-y-4">
                  {/* Document Meta Stats */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                      <span className="text-[10px] text-muted-foreground font-display font-semibold uppercase">Total Chunks</span>
                      <p className="text-sm font-bold text-foreground mt-0.5">{docContent.chunk_count || 1}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/50 border border-border">
                      <span className="text-[10px] text-muted-foreground font-display font-semibold uppercase">PII Redacted</span>
                      <p className="text-sm font-bold text-primary mt-0.5">{docContent.pii_detected_count || 0} entities</p>
                    </div>
                  </div>

                  {/* Masked Preview Text */}
                  <div>
                    <label className="font-display text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                      Full Document Text (Redacted)
                    </label>
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border text-foreground text-xs whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto font-sans select-text">
                      {docContent.masked_preview || 'No preview content available.'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  Document content preview unavailable.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/20 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Strict Tenant Isolation Verified</span>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost px-4 py-1.5 text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
