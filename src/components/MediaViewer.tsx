/**
 * Sleek Interface Ephemeral Fullscreen Media Viewer with View-Once Burn Trigger and Zoom Controls
 */

import React, { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Flame, ShieldAlert, Download, FileText, Lock } from 'lucide-react';

interface MediaViewerProps {
  mediaUrl: string;
  fileName: string;
  mimeType: string;
  isViewOnce: boolean;
  onClose: () => void;
  onBurn?: () => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({
  mediaUrl,
  fileName,
  mimeType,
  isViewOnce,
  onClose,
  onBurn,
}) => {
  const [zoom, setZoom] = useState(1);
  const isImage = mimeType.startsWith('image/');
  const isVideo = mimeType.startsWith('video/');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isViewOnce, onBurn, onClose]);

  const handleClose = () => {
    if (isViewOnce && onBurn) {
      onBurn();
    }
    onClose();
  };

  const zoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const resetZoom = () => setZoom(1);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-xl animate-fade-in select-none"
    >
      {/* Top Control Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#0c0e14]/90 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          {isViewOnce ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold rounded-full animate-pulse shrink-0">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>VIEW-ONCE MEDIA</span>
            </div>
          ) : (
            <div className="text-xs text-slate-300 font-mono font-medium truncate max-w-xs sm:max-w-md">
              {fileName}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isImage && (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mr-1">
              <button
                onClick={zoomOut}
                disabled={zoom <= 0.5}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 disabled:opacity-30 transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-slate-400 px-1">{Math.round(zoom * 100)}%</span>
              <button
                onClick={zoomIn}
                disabled={zoom >= 3}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 disabled:opacity-30 transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={resetZoom}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!isViewOnce && (
            <a
              href={mediaUrl}
              download={fileName}
              className="p-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer"
              title="Download Decrypted File"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          <button
            onClick={handleClose}
            className="p-2 text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition cursor-pointer"
            title="Close Viewer (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Ephemeral Viewer Canvas */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-auto">
        {isImage && (
          <div className="relative transition-transform duration-200 max-h-full flex items-center justify-center">
            <img
              src={mediaUrl}
              alt={fileName}
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
              className="max-h-[82vh] max-w-[92vw] object-contain rounded-xl shadow-2xl transition-all"
            />
          </div>
        )}

        {isVideo && (
          <div className="max-w-4xl w-full flex items-center justify-center">
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="max-h-[80vh] w-full rounded-2xl shadow-2xl border border-white/10 bg-black"
            />
          </div>
        )}

        {!isImage && !isVideo && (
          <div className="p-8 bg-[#141722] border border-white/10 rounded-2xl text-center space-y-4 max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-white truncate max-w-xs">{fileName}</h4>
              <p className="text-xs text-slate-400 font-mono">{mimeType}</p>
            </div>
            {!isViewOnce ? (
              <a
                href={mediaUrl}
                download={fileName}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </a>
            ) : (
              <p className="text-xs text-amber-400 italic">View-once documents cannot be exported.</p>
            )}
          </div>
        )}
      </div>

      {/* Ephemeral Warning Footer */}
      {isViewOnce && (
        <div className="px-6 py-3 bg-amber-500/10 border-t border-amber-500/20 flex items-center justify-center gap-2 text-xs text-amber-300 font-medium select-none">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Closing this viewer will permanently erase this decrypted media from all devices.</span>
        </div>
      )}
    </div>
  );
};
