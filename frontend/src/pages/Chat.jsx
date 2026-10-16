import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
import { SourceViewerSidePanel } from '../components/SourceViewerSidePanel';
import {
  MessageSquare,
  Send,
  Sparkles,
  ShieldCheck,
  FileText,
  Trash2,
  Bot,
  User,
  ChevronRight,
  Copy,
  Check,
  Download,
  Plus,
  Edit2,
  CheckCheck,
  X,
  FileCode,
  FileDown,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  AlertCircle,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export const Chat = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  // Source side panel state
  const [selectedSourceChunk, setSelectedSourceChunk] = useState(null);
  const [isSourcePanelOpen, setIsSourcePanelOpen] = useState(false);

  // Session editing state
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmSessionId, setDeleteConfirmSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const chatEndRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const queryClient = useQueryClient();

  // Close export dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Fetch Chat Sessions
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ['chatSessions'],
    queryFn: chatApi.getSessions,
  });

  // Set initial active session when sessions load
  useEffect(() => {
    if (sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // 2. Fetch Messages for Active Session
  const { data: sessionMessages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['chatMessages', activeSessionId],
    queryFn: () => (activeSessionId ? chatApi.getSessionMessages(activeSessionId) : chatApi.getHistory()),
    enabled: !!activeSessionId,
  });

  useEffect(() => {
    if (sessionMessages) {
      setMessages(sessionMessages);
    }
  }, [sessionMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Create Session Mutation
  const createSessionMutation = useMutation({
    mutationFn: () => chatApi.createSession('New Conversation'),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
      setActiveSessionId(newSession.id);
      setMessages([]);
    },
  });

  // 4. Rename Session Mutation
  const renameSessionMutation = useMutation({
    mutationFn: ({ id, title }) => chatApi.renameSession(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
      setEditingSessionId(null);
    },
  });

  // 5. Delete Session Mutation
  const deleteSessionMutation = useMutation({
    mutationFn: (id) => chatApi.deleteSession(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
      setDeleteConfirmSessionId(null);
      if (activeSessionId === deletedId) {
        const remaining = sessions.filter((s) => s.id !== deletedId);
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
        } else {
          setActiveSessionId(null);
          setMessages([]);
        }
      }
    },
  });

  // 6. Ask Question Mutation
  const askMutation = useMutation({
    mutationFn: (q) => chatApi.askQuestion(q, activeSessionId),
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data]);
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      if (data.session_id && data.session_id !== activeSessionId) {
        setActiveSessionId(data.session_id);
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim() || askMutation.isPending) return;

    const userQuestion = question.trim();
    setQuestion('');

    // Optimistic UI update
    const tempUserMsg = {
      id: `temp_${Date.now()}`,
      question: userQuestion,
      answer: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    askMutation.mutate(userQuestion);
  };

  const handleClearHistory = async () => {
    if (!activeSessionId) return;
    await chatApi.clearHistory(activeSessionId);
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: ['chatMessages', activeSessionId] });
    queryClient.invalidateQueries({ queryKey: ['chatSessions'] });
  };

  const handleCopyAnswer = (text, msgId) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export report as PDF or DOCX
  const handleExport = async (format) => {
    setIsExportMenuOpen(false);
    setIsExporting(true);
    setExportError('');

    try {
      const response = await chatApi.exportReport(activeSessionId, format);
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanTitle = activeSession?.title?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Chat_Report';
      link.setAttribute('download', `SecureDoc_${cleanTitle}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      setExportError('Failed to generate export report.');
    } finally {
      setIsExporting(false);
    }
  };

  // Open interactive source citation side panel
  const handleOpenSource = (chunk) => {
    setSelectedSourceChunk(chunk);
    setIsSourcePanelOpen(true);
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  const samplePrompts = [
    'Summarize key insights from my uploaded documents.',
    'What are the critical dates and deadlines mentioned?',
    'List all compliance and security requirements outlined in the files.',
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 animate-fadeIn select-none">
      {/* ========================================================= */}
      {/* 1. Multi-Chat Session Sidebar */}
      {/* ========================================================= */}
      <div
        className={`${
          isSidebarOpen ? 'w-72' : 'w-0 hidden md:flex md:w-14'
        } transition-all duration-200 glass-card rounded-2xl flex flex-col overflow-hidden shrink-0`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-border/80 flex items-center justify-between">
          {isSidebarOpen ? (
            <>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="font-display text-xs font-bold text-foreground">Conversations</span>
                <span className="badge badge-info text-[10px] py-0 px-1.5 font-mono">
                  {sessions.length}
                </span>
              </div>
              <button
                onClick={() => createSessionMutation.mutate()}
                className="btn-primary text-xs py-1 px-2.5 flex items-center gap-1 cursor-pointer"
                title="Create New Thread"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="btn-ghost p-1.5 text-muted-foreground hover:text-foreground mx-auto cursor-pointer"
              title="Expand Threads"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sessions List */}
        {isSidebarOpen && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingSessions ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                <span>Loading threads...</span>
              </div>
            ) : sessions.length > 0 ? (
              sessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                const isEditing = sess.id === editingSessionId;

                return (
                  <div
                    key={sess.id}
                    onClick={() => {
                      if (!isEditing) setActiveSessionId(sess.id);
                    }}
                    className={`group relative p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary/10 border-primary/30 text-primary font-semibold shadow-xs'
                        : 'bg-transparent border-transparent text-foreground/80 hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameSessionMutation.mutate({ id: sess.id, title: editTitle });
                            } else if (e.key === 'Escape') {
                              setEditingSessionId(null);
                            }
                          }}
                          autoFocus
                          className="input-premium py-1 px-2 text-xs w-full"
                        />
                        <button
                          onClick={() => renameSessionMutation.mutate({ id: sess.id, title: editTitle })}
                          className="btn-ghost p-1 text-success cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingSessionId(null)}
                          className="btn-ghost p-1 text-muted-foreground cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="truncate min-w-0 flex-1">
                          <p className="truncate font-display font-medium text-xs">{sess.title}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                            {new Date(sess.updated_at).toLocaleDateString()} &bull; {sess.message_count || 0} msgs
                          </p>
                        </div>

                        {/* Quick action icons */}
                        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSessionId(sess.id);
                              setEditTitle(sess.title);
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-background/80 transition-colors cursor-pointer"
                            title="Rename Thread"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmSessionId(sess.id);
                            }}
                            className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-background/80 transition-colors cursor-pointer"
                            title="Delete Thread"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground p-3">
                <p>No conversation threads yet.</p>
                <button
                  onClick={() => createSessionMutation.mutate()}
                  className="btn-primary text-xs py-1.5 px-3 mt-3 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start First Thread</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Collapse toggle at bottom */}
        {isSidebarOpen && (
          <div className="p-2 border-t border-border/80 flex justify-end">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="btn-ghost p-1.5 text-muted-foreground hover:text-foreground text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
              <span>Collapse</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 2. Main Chat Conversation Area */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col min-w-0 space-y-3">
        {/* Control Header */}
        <div className="glass-card flex items-center justify-between p-3.5 rounded-2xl shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="btn-ghost p-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Expand Conversation Threads"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold shadow-xs shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>

            <div className="min-w-0">
              <h3 className="font-display text-xs sm:text-sm font-bold text-foreground truncate max-w-xs sm:max-w-md">
                {activeSession?.title || 'AI Knowledge Assistant'}
              </h3>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium truncate">
                <ShieldCheck className="w-3 h-3 text-primary" />
                Grounded in your encrypted document repository
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Export Report Dropdown */}
            {messages.length > 0 && (
              <div className="relative" ref={exportDropdownRef}>
                <button
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  disabled={isExporting}
                  className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isExporting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  <span>Export Report</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </button>

                {isExportMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-card border border-border shadow-card p-1 z-30 animate-fadeIn">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-primary" />
                      <span>Download PDF (.pdf)</span>
                    </button>
                    <button
                      onClick={() => handleExport('docx')}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary rounded-lg flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span>Download Word (.docx)</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Clear History Button */}
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="btn-ghost text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 sm:px-2.5 sm:py-1.5 flex items-center gap-1 cursor-pointer"
                title="Clear Current Thread History"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 rounded-2xl glass-card space-y-6">
          {isLoadingMessages ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-3" />
              <p className="text-xs font-medium">Loading conversation messages...</p>
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg, idx) => {
              const chunks = msg.retrieved_chunks || msg.source_chunks || [];
              const docNames = msg.referenced_documents || Array.from(new Set(chunks.map((c) => c.filename).filter(Boolean)));

              return (
                <div key={msg.id || idx} className="space-y-3">
                  {/* User Question Bubble */}
                  <div className="flex items-start justify-end gap-2.5">
                    <div className="max-w-xl p-3.5 rounded-2xl bg-primary/15 border border-primary/25 text-foreground text-xs sm:text-sm leading-relaxed shadow-xs font-medium">
                      {msg.question}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* AI Assistant Answer Bubble */}
                  {msg.answer ? (
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-primary font-bold text-xs shrink-0">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="max-w-2xl space-y-2.5">
                        <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border text-foreground text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-card">
                          {msg.answer}
                        </div>

                        {/* Interactive Citations & Source Badges */}
                        <div className="space-y-1.5 pt-1">
                          {/* Confidence score */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {msg.confidence_score > 0 && (
                                <span className="badge badge-success text-[10px] py-0 px-2">
                                  <Sparkles className="w-3 h-3" />
                                  {(msg.confidence_score * 100).toFixed(0)}% Confidence Score
                                </span>
                              )}
                            </div>

                            {/* Copy Answer Button */}
                            <button
                              onClick={() => handleCopyAnswer(msg.answer, msg.id || idx)}
                              className="btn-ghost text-xs py-0.5 px-2 font-medium flex items-center gap-1 cursor-pointer text-muted-foreground hover:text-foreground"
                            >
                              {copiedId === (msg.id || idx) ? (
                                <>
                                  <Check className="w-3 h-3 text-success" />
                                  <span className="text-success text-[11px] font-semibold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span className="text-[11px]">Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Clickable Source Badges */}
                          {chunks.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <span className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-wider mr-1 flex items-center gap-1">
                                <FileText className="w-3 h-3 text-primary" />
                                <span>Citations:</span>
                              </span>

                              {chunks.map((chk, chkIdx) => {
                                const sim = chk.similarity_score ? Math.round(chk.similarity_score * 100) : null;
                                return (
                                  <button
                                    key={chk.chunk_id || chkIdx}
                                    onClick={() => handleOpenSource(chk)}
                                    className="badge badge-info text-[11px] py-1 px-2.5 flex items-center gap-1.5 hover:bg-primary/20 hover:border-primary/40 hover:scale-[1.02] transition-all cursor-pointer font-medium shadow-2xs"
                                    title="Click to view citation excerpt & document preview in side panel"
                                  >
                                    <FileCode className="w-3 h-3 text-primary shrink-0" />
                                    <span className="truncate max-w-[140px] sm:max-w-[200px]">
                                      {chk.filename || `Source ${chkIdx + 1}`}
                                    </span>
                                    {sim !== null && (
                                      <span className="text-[10px] opacity-80 font-mono">({sim}%)</span>
                                    )}
                                    <ExternalLink className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Loading Answer State */
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-primary font-bold text-xs shrink-0 animate-pulse">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="p-3.5 rounded-2xl bg-card border border-border text-muted-foreground text-xs flex items-center gap-2">
                        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span>Searching document vectors & generating answer...</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            /* Empty Chat State */
            <div className="py-12 text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center text-primary shadow-elegant">
                <MessageSquare className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-display text-base font-bold text-foreground">
                  Ask anything about your documents
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Type your query below to retrieve accurate facts with clickable citations.
                </p>
              </div>

              {/* Sample Prompts */}
              <div className="max-w-xl mx-auto space-y-2 pt-2">
                <span className="font-display text-[10px] font-bold text-muted-foreground uppercase tracking-wider block text-center">
                  Suggested Questions
                </span>
                <div className="grid grid-cols-1 gap-2 text-left">
                  {samplePrompts.map((promptText, i) => (
                    <button
                      key={i}
                      onClick={() => setQuestion(promptText)}
                      className="p-3 rounded-xl bg-card border border-border hover:border-primary/50 text-xs text-foreground/80 hover:text-foreground transition-all text-left flex items-center justify-between group cursor-pointer"
                    >
                      <span>"{promptText}"</span>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Question Input Form */}
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your uploaded documents..."
            className="input-premium py-3 pl-4 pr-12 text-xs sm:text-sm"
          />
          <button
            type="submit"
            disabled={!question.trim() || askMutation.isPending}
            className="btn-primary shrink-0 py-3 px-4 flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>

      {/* ========================================================= */}
      {/* 3. Interactive Source Viewer Side Panel */}
      {/* ========================================================= */}
      <SourceViewerSidePanel
        isOpen={isSourcePanelOpen}
        onClose={() => setIsSourcePanelOpen(false)}
        sourceChunk={selectedSourceChunk}
      />

      {/* Delete Thread Confirmation Modal */}
      {deleteConfirmSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="glass-card rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-card">
            <div className="flex items-center gap-2.5 text-destructive font-display font-bold text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Delete Conversation Thread</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to delete this thread? All messages in this conversation will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmSessionId(null)}
                className="btn-ghost px-3 py-1.5 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSessionMutation.mutate(deleteConfirmSessionId)}
                className="px-3 py-1.5 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                Delete Thread
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
