import React, { useState, useEffect } from 'react';
import { Link, Edit3, ExternalLink } from 'lucide-react';
import { EmbeddedLink as EmbeddedLinkType } from '../types/whiteboard';

interface EmbeddedLinkProps {
  element: EmbeddedLinkType;
  onUpdate: (id: string, updates: Partial<EmbeddedLinkType>) => void;
  onDragStart: (id: string) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onDragEnd: () => void;
}

export default function EmbeddedLink({ element, onUpdate, onDragStart, onDrag, onDragEnd }: EmbeddedLinkProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tempUrl, setTempUrl] = useState(element.url);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
    onDragStart(element.id);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const container = document.getElementById('whiteboard-container');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const x = e.clientX - containerRect.left - dragOffset.x;
    const y = e.clientY - containerRect.top - dragOffset.y;
    
    onDrag(element.id, x, y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    onDragEnd();
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const handleUrlSubmit = () => {
    onUpdate(element.id, { url: tempUrl });
    setIsEditing(false);
  };

  const isYouTube = element.url.includes('youtube.com') || element.url.includes('youtu.be');
  const getEmbedUrl = () => {
    if (isYouTube) {
      const videoId = element.url.match(/(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      return videoId ? `https://www.youtube.com/embed/${videoId[1]}` : element.url;
    }
    return element.url;
  };

  return (
    <div
      className="absolute bg-white rounded-lg shadow-lg cursor-move transition-all duration-200 hover:shadow-xl group border border-gray-200"
      style={{ left: element.x, top: element.y, width: '400px', height: '300px' }}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="p-1 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow"
        >
          <Edit3 size={12} className="text-gray-600" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            window.open(element.url, '_blank');
          }}
          className="p-1 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow"
        >
          <ExternalLink size={12} className="text-gray-600" />
        </button>
      </div>

      {isEditing ? (
        <div className="p-4 h-full flex flex-col">
          <div className="text-xs font-semibold text-gray-700 mb-2">URL:</div>
          <input
            value={tempUrl}
            onChange={(e) => setTempUrl(e.target.value)}
            onBlur={handleUrlSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUrlSubmit();
              }
            }}
            className="w-full p-2 border border-gray-300 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://example.com"
          />
          <button
            onClick={handleUrlSubmit}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors self-start"
          >
            Embed
          </button>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2 text-xs font-semibold text-gray-700">
            <Link size={12} />
            {isYouTube ? 'YouTube Video' : 'Embedded Content'}
          </div>
          <div className="flex-1 p-2">
            {element.url ? (
              <iframe
                src={getEmbedUrl()}
                className="w-full h-full border-0 rounded"
                title="Embedded content"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                Click edit to add a URL
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}