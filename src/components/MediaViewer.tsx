/**
 * Sleek Interface Ephemeral Fullscreen Media Viewer with View-Once Burn Trigger and Zoom Controls
 */

import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Flame, ShieldAlert, Download, FileText } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl animate-fade-in select-none">
      {/* Top Control Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {isViewOnce ? (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold rounded-full animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>VIEW-ONCE MEDIA</span>
            </div>
          ) : (
            <div className="text-xs text-slate-300 font-mono font-medium truncate max-w-xs">
              {fileName}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isImage && (
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mr-2">
              <button
                onClick={zoomOut}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-400 px-1">{Math.round(zoom * 100)}%</span>
              <button
                onClick={zoomIn}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={resetZoom}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
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
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition cursor-pointer"
              title="Download File"
            >
              <Download className="w-5 h-5" />
            </a>
          )}

          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition cursor-pointer"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        {isImage && (
          <img
            src={mediaUrl}
            alt={fileName}
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease-out' }}
            className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10"
          />
        )}

        {isVideo && (
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-h-[82vh] max-w-full rounded-2xl shadow-2xl border border-white/10"
          />
        )}

        {!isImage && !isVideo && (
          <div className="p-8 bg-[#0a0a0a] border border-white/10 rounded-2xl text-center space-y-4 max-w-md shadow-2xl">
            <FileText className="w-16 h-16 text-indigo-400 mx-auto" />
            <div>
              <h3 className="text-base font-semibold text-white">{fileName}</h3>
              <p className="text-xs text-slate-400 font-mono mt-1">{mimeType}</p>
            </div>
            {!isViewOnce ? (
              <a
                href={mediaUrl}
                download={fileName}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Decrypted File
              </a>
            ) : (
              <p className="text-xs text-amber-400 font-medium">
                Decrypted view-once document will be purged from memory on exit.
              </p>
            )}
          </div>
        )}
      </div>

      {/* View-Once Bottom Disclaimer Bar */}
      {isViewOnce && (
        <div className="px-6 py-3 bg-amber-950/30 border-t border-amber-500/20 text-center flex items-center justify-center gap-2 text-xs text-amber-300">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            This media is ephemeral and will be destroyed when you close this viewer.
          </span>
        </div>
      )}
    </div>
  );
};
