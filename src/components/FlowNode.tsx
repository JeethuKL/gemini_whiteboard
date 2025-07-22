import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Link } from 'lucide-react';
import { FlowNode as FlowNodeType } from '../types/whiteboard';

interface FlowNodeProps {
  element: FlowNodeType;
  onUpdate: (id: string, updates: Partial<FlowNodeType>) => void;
  onDragStart: (id: string) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onDragEnd: () => void;
}

export default function FlowNode({ element, onUpdate, onDragStart, onDrag, onDragEnd }: FlowNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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

  const handleTextSubmit = () => {
    setIsEditing(false);
  };

  const getShapeClass = () => {
    switch (element.shape) {
      case 'diamond':
        return 'transform rotate-45 bg-gradient-to-br from-blue-400 to-blue-600';
      case 'circle':
        return 'rounded-full bg-gradient-to-br from-green-400 to-green-600';
      case 'ellipse':
        return 'rounded-full bg-gradient-to-br from-purple-400 to-purple-600';
      default:
        return 'rounded-lg bg-gradient-to-br from-gray-400 to-gray-600';
    }
  };

  const getContentClass = () => {
    return element.shape === 'diamond' ? 'transform -rotate-45' : '';
  };

  return (
    <div
      className={`absolute w-32 h-20 ${getShapeClass()} shadow-lg cursor-move transition-all duration-200 hover:shadow-xl group flex items-center justify-center`}
      style={{ left: element.x, top: element.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="p-1 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow"
        >
          <Edit3 size={10} className="text-gray-600" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Handle connection logic
          }}
          className="p-1 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow"
        >
          <Link size={10} className="text-gray-600" />
        </button>
      </div>

      <div className={`text-center px-2 ${getContentClass()}`}>
        {isEditing ? (
          <input
            ref={inputRef}
            value={element.label}
            onChange={(e) => onUpdate(element.id, { label: e.target.value })}
            onBlur={handleTextSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleTextSubmit();
              }
            }}
            className="w-full bg-transparent border-none outline-none text-xs font-semibold text-white text-center placeholder-gray-200"
            placeholder="Label..."
          />
        ) : (
          <div className="text-xs font-semibold text-white">
            {element.label || 'Node'}
          </div>
        )}
      </div>
    </div>
  );
}