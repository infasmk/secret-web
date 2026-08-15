/**
 * Chat Composer with Drag & Drop, Ephemeral View-Once Toggle, and Real-Time Typing
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Flame, X, Image as ImageIcon, FileText, AlertCircle } from 'lucide-react';

interface ChatComposerProps {
  allowFileUploads: boolean;
  allowViewOnce: boolean;
  maxFileSizeMb: number;
  onSendMessage: (text: string, isViewOnce: boolean) => Promise<void>;
  onSendMedia: (file: File, isViewOnce: boolean) => Promise<void>;
  onTyping: (isTyping: boolean) => void;
  isUploading: boolean;
  uploadProgress: number;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  allowFileUploads,
  allowViewOnce,
  maxFileSizeMb,
  onSendMessage,
  onSendMedia,
  onTyping,
  isUploading,
  uploadProgress,
}) => {
  const [text, setText] = useState('');
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<any>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setError(null);

    // Emit typing status
    onTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTyping(false);
    }, 2500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    if (!allowFileUploads) {
      setError('File uploads are disabled in this room');
      return;
    }

    const maxBytes = maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`File exceeds maximum room limit of ${maxFileSizeMb}MB`);
      return;
    }

    setPendingFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (allowFileUploads) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isUploading) return;

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    onTyping(false);

    try {
      if (pendingFile) {
        const fileToUpload = pendingFile;
        const viewOnceSetting = isViewOnce;
        setPendingFile(null);
        setIsViewOnce(false);
        await onSendMedia(fileToUpload, viewOnceSetting);
      } else if (text.trim()) {
        const textToSend = text.trim();
        setText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        await onSendMessage(textToSend, isViewOnce);
        setIsViewOnce(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send');
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`p-3 sm:p-4 bg-[#0a0a0a]/95 border-t border-white/5 backdrop-blur-md relative transition-all ${
        isDragging ? 'bg-indigo-950/40 border-indigo-500/50' : ''
      }`}
    >
      {/* Drag & Drop Feedback Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-indigo-950/80 border-2 border-dashed border-indigo-400 rounded-t-xl flex items-center justify-center text-indigo-300 text-xs font-semibold z-20 pointer-events-none">
          Drop encrypted attachment here
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between text-xs text-red-300">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Uploading Progress Bar */}
      {isUploading && (
        <div className="mb-2 space-y-1 animate-fade-in">
          <div className="flex items-center justify-between text-[11px] text-indigo-400 font-mono font-medium">
            <span>Encrypting & Vaulting attachment...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Pending File Attachment Chip */}
      {pendingFile && !isUploading && (
        <div className="mb-2 p-2.5 bg-black/50 border border-white/10 rounded-xl flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
              {pendingFile.type.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-200 font-medium truncate max-w-[200px]">
                {pendingFile.name}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {(pendingFile.size / 1024).toFixed(1)} KB {isViewOnce ? '• 🔥 View-Once' : ''}
              </div>
            </div>
          </div>
          <button
            onClick={() => setPendingFile(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 max-w-5xl mx-auto">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          disabled={!allowFileUploads || isUploading}
        />

        {/* Attachment & View-Once Buttons */}
        <div className="flex items-center gap-1 shrink-0 pb-1">
          {allowFileUploads && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition cursor-pointer disabled:opacity-40"
              title="Attach File or Image"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          )}

          {allowViewOnce && (
            <button
              type="button"
              onClick={() => setIsViewOnce(!isViewOnce)}
              className={`p-2.5 rounded-xl transition cursor-pointer ${
                isViewOnce
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title={isViewOnce ? 'View-Once Active (Disappears after viewing)' : 'Enable View-Once'}
            >
              <Flame className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Message Input Box */}
        <div className="flex-1 bg-white/5 border border-white/10 focus-within:border-indigo-500/80 rounded-2xl px-4 py-2 transition shadow-inner">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={isUploading}
            placeholder={pendingFile ? 'Press Send to encrypt attachment...' : 'Type a private message...'}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-32 py-1 leading-relaxed selection:bg-indigo-500/30"
          />
        </div>

        {/* Send Action Button */}
        <button
          type="submit"
          disabled={(!text.trim() && !pendingFile) || isUploading}
          className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition disabled:opacity-40 disabled:hover:bg-indigo-600 cursor-pointer shrink-0 pb-3"
          title="Send Encrypted Message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
