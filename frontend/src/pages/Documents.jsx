import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '../api/documentApi';
import { DocumentModal } from '../components/DocumentModal';
import { DocumentVersionHistoryModal } from '../components/DocumentVersionHistoryModal';
import {
  FileText,
  Trash2,
  Eye,
  Search,
  ShieldCheck,
  AlertCircle,
  Plus,
  History,
  Archive,
  Layers,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Documents = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [docContent, setDocContent] = useState(null);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [historyDoc, setHistoryDoc] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch Documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['userDocuments', showArchived],
    queryFn: () => documentApi.getDocuments(showArchived),
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: documentApi.deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      setDeleteConfirmId(null);
    },
  });

  const handleInspectContent = async (docId) => {
    setSelectedDocId(docId);
    setIsLoadingContent(true);
    try {
      const data = await documentApi.viewDocumentContent(docId);
      setDocContent(data);
    } catch (err) {
      console.error('Failed to view document content:', err);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const getFileType = (filename) => {
    const ext = filename.split('.').pop().toUpperCase();
    return ext || 'FILE';
  };

  const filteredDocs = documents.filter((doc) =>
    doc.original_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Controls */}
      <div className="glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            My Document Repository
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your uploaded files, track version history, and monitor automated PII masking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Archived Toggle */}
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`btn-ghost text-xs py-2 px-3 flex items-center gap-1.5 rounded-xl border transition-all cursor-pointer ${
              showArchived
                ? 'bg-primary/10 text-primary border-primary/30 font-semibold'
                : 'text-muted-foreground border-border hover:text-foreground'
            }`}
            title="Toggle previous archived document versions"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{showArchived ? 'Showing All Versions' : 'Latest Only'}</span>
          </button>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-premium pl-9 py-2 text-xs w-44 sm:w-56"
            />
          </div>

          <button
            onClick={() => navigate('/upload')}
            className="btn-primary flex items-center gap-1.5 shrink-0 text-xs py-2 px-3.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload File</span>
          </button>
        </div>
      </div>

      {/* Documents Table */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium">Loading document repository...</p>
        </div>
      ) : filteredDocs.length > 0 ? (
        <div className="card-premium overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground">
              <thead className="bg-secondary/60 text-muted-foreground font-display uppercase text-[10px] font-bold tracking-wider border-b border-border">
                <tr>
                  <th className="py-4 px-6">Document Name</th>
                  <th className="py-4 px-6">Version</th>
                  <th className="py-4 px-6">File Type</th>
                  <th className="py-4 px-6">Upload Date</th>
                  <th className="py-4 px-6">Size</th>
                  <th className="py-4 px-6">Protection</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-secondary/40 transition-colors">
                    <td className="py-4 px-6 font-display font-semibold text-foreground flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="truncate max-w-xs">
                        <span className="truncate block">{doc.original_name}</span>
                        {!doc.is_latest && (
                          <span className="text-[10px] text-amber-500 font-mono flex items-center gap-1 mt-0.5">
                            <Archive className="w-2.5 h-2.5" />
                            Archived version
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Version Badge */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold bg-primary/15 text-primary border border-primary/25 shadow-xs">
                        v{doc.version || 1}
                      </span>
                    </td>

                    <td className="py-4 px-6 font-mono text-muted-foreground">
                      <span className="px-2 py-0.5 rounded bg-secondary border border-border text-[10px] font-bold text-foreground">
                        {getFileType(doc.original_name)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground font-mono">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 font-mono text-muted-foreground">
                      {(doc.file_size / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="py-4 px-6">
                      <span className="badge badge-info text-[11px]">
                        <ShieldCheck className="w-3 h-3" />
                        Protected
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                      {/* Version History Button */}
                      <button
                        onClick={() => setHistoryDoc(doc)}
                        className="btn-ghost py-1 px-2.5 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                        title="View Version History"
                      >
                        <History className="w-3.5 h-3.5 text-primary" />
                        <span>History</span>
                      </button>

                      {/* View Content Button */}
                      <button
                        onClick={() => handleInspectContent(doc.id)}
                        className="btn-ghost py-1 px-2.5 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                        title="View Document Content"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span>View</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => setDeleteConfirmId(doc.id)}
                        className="btn-ghost py-1 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 hover:border-destructive/30 inline-flex items-center gap-1.5 cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card-premium p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center text-primary shadow-sm">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-display text-base font-bold text-foreground">No documents uploaded yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Upload your first document to index its contents for secure AI search.
          </p>
          <button
            onClick={() => navigate('/upload')}
            className="btn-primary inline-flex items-center gap-2 text-xs py-2.5 px-5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="glass-card rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-card">
            <div className="flex items-center gap-3 text-destructive font-display font-bold text-base">
              <AlertCircle className="w-5 h-5" />
              <span>Delete Document</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this document? This action will remove its vector embeddings from search.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-ghost px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Document Preview Modal */}
      <DocumentModal
        isOpen={!!selectedDocId}
        onClose={() => {
          setSelectedDocId(null);
          setDocContent(null);
        }}
        documentContent={docContent}
        isLoading={isLoadingContent}
      />

      {/* Version History Modal */}
      <DocumentVersionHistoryModal
        isOpen={!!historyDoc}
        onClose={() => setHistoryDoc(null)}
        document={historyDoc}
      />
    </div>
  );
};
