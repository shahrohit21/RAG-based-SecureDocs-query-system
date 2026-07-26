import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chatApi';
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
} from 'lucide-react';

export const Chat = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const chatEndRef = useRef(null);
  const queryClient = useQueryClient();

  // Load past history
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['chatHistory'],
    queryFn: chatApi.getHistory,
  });

  useEffect(() => {
    if (history.length > 0) {
      setMessages(history);
    }
  }, [history]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ask Question Mutation
  const askMutation = useMutation({
    mutationFn: chatApi.askQuestion,
    onSuccess: (data) => {
      setMessages((prev) => [...prev, data]);
      queryClient.invalidateQueries({ queryKey: ['chatHistory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
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
    await chatApi.clearHistory();
    setMessages([]);
    queryClient.invalidateQueries({ queryKey: ['chatHistory'] });
  };

  const handleCopyAnswer = (text, msgId) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const samplePrompts = [
    'Summarize key insights from my uploaded documents.',
    'What are the critical dates and deadlines mentioned?',
    'List all compliance and security requirements outlined in the files.',
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col max-w-4xl mx-auto space-y-4 animate-fadeIn">
      {/* Control Header */}
      <div className="glass-card flex items-center justify-between p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold shadow-sm shrink-0">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
              AI Knowledge Assistant
            </h3>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Grounded in your encrypted document repository
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="btn-ghost text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 rounded-2xl glass-card space-y-6">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium">Loading conversation history...</p>
          </div>
        ) : messages.length > 0 ? (
          messages.map((msg, idx) => {
            const sources = msg.referenced_documents || (msg.source_chunks ? Array.from(new Set(msg.source_chunks.map(c => c.filename).filter(Boolean))) : []);

            return (
              <div key={msg.id || idx} className="space-y-4">
                {/* User Question Bubble */}
                <div className="flex items-start justify-end gap-3">
                  <div className="max-w-xl p-4 rounded-2xl bg-primary/15 border border-primary/25 text-foreground text-sm leading-relaxed shadow-sm font-medium">
                    {msg.question}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                </div>

                {/* AI Assistant Answer Bubble */}
                {msg.answer ? (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="max-w-2xl space-y-3">
                      <div className="p-5 rounded-2xl bg-card border border-border text-foreground text-sm leading-relaxed whitespace-pre-wrap shadow-card">
                        {msg.answer}
                      </div>

                      {/* Source Documents & Confidence */}
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Answer Confidence */}
                          {msg.confidence_score > 0 && (
                            <span className="badge badge-success text-[11px]">
                              <Sparkles className="w-3 h-3" />
                              {(msg.confidence_score * 100).toFixed(0)}% Confidence Score
                            </span>
                          )}

                          {/* Source Documents List */}
                          {sources.length > 0 && (
                            <span className="badge badge-info text-[11px]">
                              <FileText className="w-3 h-3" />
                              <span>Sources: {sources.join(', ')}</span>
                            </span>
                          )}
                        </div>

                        {/* Copy Answer Button */}
                        <button
                          onClick={() => handleCopyAnswer(msg.answer, msg.id || idx)}
                          className="btn-ghost text-xs py-1 px-2.5 font-medium flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedId === (msg.id || idx) ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-success" />
                              <span className="text-success font-semibold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>Copy Answer</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Loading State */
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center text-primary font-bold text-xs shrink-0 animate-pulse">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-4 rounded-2xl bg-card border border-border text-muted-foreground text-xs flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
            <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center text-primary shadow-elegant">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="font-display text-lg font-bold text-foreground">Ask anything about your documents</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Type your query below to retrieve accurate facts with source citations.
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
                    className="p-3.5 rounded-xl bg-card border border-border hover:border-primary/50 text-xs text-foreground/80 hover:text-foreground transition-all text-left flex items-center justify-between group cursor-pointer"
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
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your uploaded documents..."
          className="input-premium py-3.5 pl-5 pr-14 text-sm"
        />
        <button
          type="submit"
          disabled={!question.trim() || askMutation.isPending}
          className="btn-primary shrink-0 py-3.5 px-5 flex items-center gap-2 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};

