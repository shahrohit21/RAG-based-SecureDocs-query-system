import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentApi } from '../api/documentApi';
import {
  UploadCloud,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const Upload = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError('');
    const validExts = ['.pdf', '.docx', '.txt', '.md'];
    const fileName = selectedFile.name.toLowerCase();
    const isValid = validExts.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setError('Invalid file format. Please upload a PDF, DOCX, or TXT document.');
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setError('File size exceeds the 15MB limit.');
      return;
    }

    setFile(selectedFile);
    setUploadedDoc(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setProgress(0);
    setError('');

    try {
      const result = await documentApi.uploadDocument(file, (percent) => {
        setProgress(percent);
      });
      setUploadedDoc(result);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload and process document.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Header Info */}
      <div className="glass-card p-6 rounded-2xl space-y-1">
        <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-primary" />
          Upload Document
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Upload documents to your secure workspace. Supported formats: PDF, DOCX, and TXT (up to 15MB).
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-3 text-destructive text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`glow-card gradient-border p-12 rounded-3xl border border-dashed transition-all duration-300 cursor-pointer text-center relative overflow-hidden ${
          isDragging
            ? 'border-primary bg-primary/10 scale-[1.01]'
            : 'border-border bg-card hover:border-primary/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mx-auto flex items-center justify-center text-primary shadow-elegant mb-4 group-hover:scale-110 transition-transform">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="font-display text-lg font-bold text-foreground mb-1">
          {isDragging ? 'Drop your document here' : 'Click to browse or drag & drop'}
        </h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
          Files are automatically scanned and masked for sensitive PII data before indexing.
        </p>

        <div className="flex items-center justify-center gap-2.5 text-[11px] font-semibold font-mono">
          <span className="badge badge-info">.PDF</span>
          <span className="badge badge-info">.DOCX</span>
          <span className="badge badge-info">.TXT</span>
        </div>
      </div>

      {/* Selected File Card & Upload Controls */}
      {file && (
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-foreground">{file.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to process
                </p>
              </div>
            </div>
            {!isUploading && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="btn-ghost p-2 text-muted-foreground hover:text-destructive rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground font-medium font-mono">
                <span>Chunking & masking document...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden border border-border">
                <div
                  className="h-full bg-gradient-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {!isUploading && (
            <button
              onClick={handleUpload}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Start Secure Upload & Indexing</span>
            </button>
          )}
        </div>
      )}

      {/* Success Banner */}
      {uploadedDoc && (
        <div className="card-premium p-6 border border-primary/30 space-y-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-success shrink-0" />
            <div>
              <h4 className="font-display text-base font-bold text-foreground">Document Uploaded & Indexed Successfully</h4>
              <p className="text-xs text-muted-foreground">
                Your document is now ready to be queried with context-aware RAG.
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/chat')}
              className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Open AI Assistant</span> <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/documents')}
              className="btn-ghost text-xs py-2.5 px-4 cursor-pointer"
            >
              View Document Repository
            </button>
          </div>
        </div>
      )}

      {/* Processing Steps */}
      <div className="card-premium p-6 space-y-3">
        <h4 className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          Automated Processing Steps
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-secondary/50 border border-border">
            <span className="text-primary font-display font-bold block">1. File Parsing</span>
            <p className="text-[11px] mt-0.5 text-muted-foreground">Extract text layout & structure</p>
          </div>
          <div className="p-3.5 rounded-xl bg-secondary/50 border border-border">
            <span className="text-accent font-display font-bold block">2. PII Sanitization</span>
            <p className="text-[11px] mt-0.5 text-muted-foreground">Redact sensitive entities</p>
          </div>
          <div className="p-3.5 rounded-xl bg-secondary/50 border border-border">
            <span className="text-primary font-display font-bold block">3. Vector Chunking</span>
            <p className="text-[11px] mt-0.5 text-muted-foreground">Generate dense embeddings</p>
          </div>
          <div className="p-3.5 rounded-xl bg-secondary/50 border border-border">
            <span className="text-success font-display font-bold block">4. Index Active</span>
            <p className="text-[11px] mt-0.5 text-muted-foreground font-semibold">Ready for RAG chat</p>
          </div>
        </div>
      </div>
    </div>
  );
};

