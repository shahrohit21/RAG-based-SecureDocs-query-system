import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { documentApi } from '../api/documentApi';
import {
  X,
  History,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Eye,
  Archive,
  ArrowRight
} from 'lucide-react';
import { DocumentModal } from './DocumentModal';

export const DocumentVersionHistoryModal = ({ isOpen, onClose, document }) => {
  const [inspectVersionId, setInspectVersionId] = useState(null);
  const [inspectContent, setInspectContent] = useState(null);
  const [isLoadingInspect, setIsLoadingInspect] = useState(false);

  const docId = document?.id;
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['documentHistory', docId],
    queryFn: () => documentApi.getDocumentHistory(docId),
    enabled: isOpen && !!docId,
  });

  if (!isOpen || !document) return null;

  const handleInspect = async (versionDocId) => {
    setInspectVersionId(versionDocId);
    setIsLoadingInspect(true);
    try {
      const data = await documentApi.viewDocumentContent(versionDocId);
      setInspectContent(data);
    } catch (err) {
      console.error('Failed to view version content:', err);
    } finally {
      setIsLoadingInspect(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fadeIn">
        <div className="glass-card rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-card overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Version History:</span>
                  <span className="text-primary truncate max-w-sm">{document.original_name}</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Track document iterations, archived versions, and vector updates.
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

          {/* History List */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
                <p className="text-xs font-medium">Loading version timeline...</p>
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((ver, idx) => {
                  const isLatest = ver.is_latest;
                  return (
                    <div
                      key={ver.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isLatest
                          ? 'bg-primary/5 border-primary/30 shadow-sm'
                          : 'bg-secondary/30 border-border hover:bg-secondary/50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-xs ${
                              isLatest
                                ? 'bg-primary text-white shadow-sm'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            v{ver.version}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-display text-xs font-bold text-foreground">
                                Version {ver.version}
                              </span>
                              {isLatest ? (
                                <span className="badge badge-success text-[10px] py-0 px-2 flex items-center gap-1 font-semibold">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Active in RAG Index
                                </span>
                              ) : (
                                <span className="badge badge-warning text-[10px] py-0 px-2 flex items-center gap-1">
                                  <Archive className="w-3 h-3" />
                                  Archived
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(ver.uploaded_at).toLocaleString()}
                              </span>
                              <span>&bull;</span>
                              <span>{(ver.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                              <span>&bull;</span>
                              <span>{ver.chunk_count} chunks</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleInspect(ver.id)}
                            className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            <span>Preview</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No version history recorded yet.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-secondary/20 flex justify-end">
            <button
              onClick={onClose}
              className="btn-primary text-xs py-2 px-5 font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Inspect Document Preview */}
      <DocumentModal
        isOpen={!!inspectVersionId}
        onClose={() => {
          setInspectVersionId(null);
          setInspectContent(null);
        }}
        documentContent={inspectContent}
        isLoading={isLoadingInspect}
      />
    </>
  );
};
