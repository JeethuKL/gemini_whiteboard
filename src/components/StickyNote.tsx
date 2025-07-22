import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Palette } from 'lucide-react';
import { StickyNote as StickyNoteType } from '../types/whiteboard';

interface StickyNoteProps {
  element: StickyNoteType;
  onUpdate: (id: string, updates: Partial<StickyNoteType>) => void;
  onDragStart: (id: string) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onDragEnd: () => void;
}

const colorOptions = [
  { name: 'Yellow', value: 'yellow', bg: 'bg-yellow-200', border: 'border-yellow-300' },
  { name: 'Pink', value: 'pink', bg: 'bg-pink-200', border: 'border-pink-300' },
  { name: 'Blue', value: 'blue', bg: 'bg-blue-200', border: 'border-blue-300' },
  { name: 'Green', value: 'green', bg: 'bg-green-200', border: 'border-green-300' },
  { name: 'Purple', value: 'purple', bg: 'bg-purple-200', border: 'border-purple-300' },
  { name: 'Orange', value: 'orange', bg: 'bg-orange-200', border: 'border-orange-300' },
];

export default function StickyNote({ element, onUpdate, onDragStart, onDrag, onDragEnd }: StickyNoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const colorConfig = colorOptions.find(c => c.value === element.color) || colorOptions[0];

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
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

  const handleColorChange = (color: string) => {
    onUpdate(element.id, { color });
    setShowColorPicker(false);
  };

  return (
    <div
      className={`absolute w-48 h-32 ${colorConfig.bg} ${colorConfig.border} border-2 rounded-lg shadow-lg cursor-move transition-all duration-200 hover:shadow-xl group`}
      style={{ left: element.x, top: element.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            setShowColorPicker(!showColorPicker);
          }}
          className="p-1 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow"
        >
          <Palette size={12} className="text-gray-600" />
        </button>
      </div>

      {showColorPicker && (
        <div className="absolute top-10 right-2 bg-white rounded-lg shadow-xl p-2 grid grid-cols-3 gap-1 z-10">
          {colorOptions.map((color) => (
            <button
              key={color.value}
              onClick={() => handleColorChange(color.value)}
              className={`w-6 h-6 rounded-full ${color.bg} ${color.border} border-2 hover:scale-110 transition-transform`}
              title={color.name}
            />
          ))}
        </div>
      )}

      <div className="p-3 h-full">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={element.text}
            onChange={(e) => onUpdate(element.id, { text: e.target.value })}
            onBlur={handleTextSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextSubmit();
              }
            }}
            className="w-full h-full resize-none bg-transparent border-none outline-none text-sm font-medium text-gray-800 placeholder-gray-500"
            placeholder="Type your note..."
          />
        ) : (
          <div className="w-full h-full text-sm font-medium text-gray-800 whitespace-pre-wrap">
            {element.text || 'Click to edit...'}
          </div>
        )}
      </div>
    </div>
  );
}