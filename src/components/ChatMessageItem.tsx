/**
 * Sleek Interface Chat Message Item with Decrypted Text & Ephemeral Media Bubble
 */

import React, { useState } from 'react';
import { ChatMessage } from '../types';
import { Lock, FileText, Image as ImageIcon, Flame, Check, CheckCheck, Play, Download, AlertCircle, Eye, Sparkles } from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
  isSelf: boolean;
  onOpenMedia: (mediaUrl: string, fileName: string, mimeType: string, isViewOnce: boolean, fileId: string) => void;
  onDecryptMedia: (fileId: string, mimeType: string, fileName: string) => Promise<string | null>;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isSelf,
  onOpenMedia,
  onDecryptMedia,
}) => {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(new Date(message.createdAt));

  // Handle System messages
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-3 select-none">
        <div className="px-4 py-1 bg-white/5 border border-white/5 rounded-full text-[11px] font-mono text-slate-400 flex items-center gap-1.5 shadow-sm">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span>{message.decryptedText || 'Secure Protocol Event'}</span>
          <span className="text-[10px] text-slate-600 font-mono">• {formattedTime}</span>
        </div>
      </div>
    );
  }

  const handleMediaClick = async () => {
    if (!message.media || message.isBurned) return;

    if (message.decryptedMediaUrl) {
      onOpenMedia(
        message.decryptedMediaUrl,
        message.media.fileName,
        message.media.mimeType,
        Boolean(message.isViewOnce),
        message.media.fileId
      );
      return;
    }

    setIsDecrypting(true);
    setDecryptError(null);

    try {
      const url = await onDecryptMedia(
        message.media.fileId,
        message.media.mimeType,
        message.media.fileName
      );
      if (url) {
        onOpenMedia(
          url,
          message.media.fileName,
          message.media.mimeType,
          Boolean(message.isViewOnce),
          message.media.fileId
        );
      } else {
        setDecryptError('Failed to decrypt attachment');
      }
    } catch (err: any) {
      setDecryptError(err.message || 'Media decryption error');
    } finally {
      setIsDecrypting(false);
    }
  };

  const isMediaImage = message.media?.mimeType.startsWith('image/');
  const isMediaVideo = message.media?.mimeType.startsWith('video/');

  return (
    <div className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'} my-2.5 group animate-fade-in`}>
      {/* Sender Header for Peers */}
      {!isSelf && (
        <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-medium text-slate-400">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: message.senderColor || '#6366f1' }}
          />
          <span className="text-slate-300 font-medium">{message.senderName}</span>
        </div>
      )}

      {/* Bubble Container */}
      <div
        className={`relative max-w-[85%] sm:max-w-md rounded-2xl p-4 shadow-md ${
          isSelf
            ? 'bg-indigo-600/20 border border-indigo-500/30 text-slate-100 rounded-tr-none'
            : 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-none'
        }`}
      >
        {/* Text Content */}
        {message.type === 'text' && (
          <div className="text-sm leading-relaxed break-words whitespace-pre-wrap font-sans select-text">
            {message.decryptedText !== undefined ? (
              message.decryptedText
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-slate-500 italic font-mono">
                <Lock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Decrypting with room key...
              </span>
            )}
          </div>
        )}

        {/* Media / File Attachment Content */}
        {(message.type === 'image' || message.type === 'video' || message.type === 'file') && message.media && (
          <div className="space-y-2">
            {/* View-Once Card */}
            {message.isViewOnce ? (
              <div
                onClick={!message.isBurned ? handleMediaClick : undefined}
                className={`w-64 aspect-[4/3] rounded-xl flex flex-col items-center justify-center p-4 transition-all relative overflow-hidden select-none ${
                  message.isBurned
                    ? 'bg-black/60 border border-white/5 text-slate-600 cursor-not-allowed opacity-75'
                    : 'bg-slate-900/70 border border-white/10 hover:border-amber-500/40 text-slate-200 group hover:bg-slate-900/90 cursor-pointer shadow-lg'
                }`}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                      message.isBurned
                        ? 'bg-white/5 text-slate-600'
                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/10'
                    }`}
                  >
                    <Flame className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-white">
                      {message.isBurned ? 'View-Once Media Burned' : 'View-Once Media Vault'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {message.isBurned
                        ? 'Purged permanently from device'
                        : isDecrypting
                        ? 'Decrypting cipher...'
                        : 'Tap to decrypt & view once'}
                    </div>
                  </div>

                  {!message.isBurned && !isDecrypting && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                      <Eye className="w-3 h-3" />
                      <span>Single View</span>
                    </div>
                  )}

                  {isDecrypting && (
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mt-1" />
                  )}
                </div>
              </div>
            ) : (
              /* Standard Media / File Card */
              <div>
                {isMediaImage && message.decryptedMediaUrl ? (
                  <div
                    onClick={handleMediaClick}
                    className="cursor-pointer rounded-xl overflow-hidden group/img relative border border-white/10 bg-black/40"
                  >
                    <img
                      src={message.decryptedMediaUrl}
                      alt="Encrypted attachment"
                      className="max-h-64 w-full object-cover rounded-xl transition group-hover/img:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center">
                      <span className="px-3 py-1 bg-black/80 text-white text-xs rounded-full backdrop-blur-sm flex items-center gap-1.5 border border-white/10">
                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                        Click to expand
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={handleMediaClick}
                    className="p-3 bg-black/40 border border-white/10 hover:border-white/20 rounded-xl flex items-center gap-3 cursor-pointer group transition select-none max-w-xs"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {isMediaImage ? (
                        <ImageIcon className="w-5 h-5" />
                      ) : isMediaVideo ? (
                        <Play className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-200 truncate group-hover:text-white transition">
                        {message.media.fileName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {(message.media.fileSize / 1024).toFixed(1)} KB •{' '}
                        <span className="text-indigo-400">AES-GCM</span>
                      </div>
                    </div>
                    <div className="p-1.5 text-slate-400 group-hover:text-white rounded-lg transition">
                      {isDecrypting ? (
                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {decryptError && (
              <div className="text-[11px] text-red-400 flex items-center gap-1 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{decryptError}</span>
              </div>
            )}
          </div>
        )}

        {/* Timestamp & Status Metadata */}
        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500 font-mono">
          <span>{formattedTime}</span>
          {isSelf && (
            <span>
              {message.status === 'sending' ? (
                <div className="w-2.5 h-2.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin ml-0.5" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="w-3.5 h-3.5 inline ml-0.5 text-indigo-400" />
              ) : (
                <Check className="w-3.5 h-3.5 inline ml-0.5 text-slate-500" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
