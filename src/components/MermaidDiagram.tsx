import React, { useEffect, useRef, useState } from 'react';
import { Edit3, Code } from 'lucide-react';
import { MermaidDiagram as MermaidDiagramType } from '../types/whiteboard';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  element: MermaidDiagramType;
  onUpdate: (id: string, updates: Partial<MermaidDiagramType>) => void;
  onDragStart: (id: string) => void;
  onDrag: (id: string, x: number, y: number) => void;
  onDragEnd: () => void;
}

export default function MermaidDiagram({ element, onUpdate, onDragStart, onDrag, onDragEnd }: MermaidDiagramProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [renderError, setRenderError] = useState<string | null>(null);
  const diagramRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  useEffect(() => {
    if (diagramRef.current && !isEditing) {
      renderMermaid();
    }
  }, [element.mermaidCode, isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const renderMermaid = async () => {
    if (!diagramRef.current || !element.mermaidCode) return;

    try {
      const { svg } = await mermaid.render(`mermaid-${element.id}`, element.mermaidCode);
      diagramRef.current.innerHTML = svg;
      setRenderError(null);
    } catch (error) {
      console.error('Mermaid render error:', error);
      setRenderError('Invalid Mermaid syntax');
      diagramRef.current.innerHTML = `<div class="text-red-500 text-sm p-4">Error: Invalid Mermaid syntax</div>`;
    }
  };

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

  const handleCodeSubmit = () => {
    setIsEditing(false);
  };

  return (
    <div
      className="absolute bg-white rounded-lg shadow-lg cursor-move transition-all duration-200 hover:shadow-xl group border border-gray-200 min-w-64 min-h-32"
      style={{ left: element.x, top: element.y }}
      onMouseDown={handleMouseDown}
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(!isEditing);
          }}
          className="p-1 bg-gray-100 rounded-full shadow-sm hover:shadow-md transition-shadow"
        >
          <Code size={12} className="text-gray-600" />
        </button>
      </div>

      {isEditing ? (
        <div className="p-4">
          <div className="text-xs font-semibold text-gray-700 mb-2">Mermaid Code:</div>
          <textarea
            ref={textareaRef}
            value={element.mermaidCode}
            onChange={(e) => onUpdate(element.id, { mermaidCode: e.target.value })}
            onBlur={handleCodeSubmit}
            className="w-full h-32 resize-none bg-gray-50 border border-gray-300 rounded text-sm font-mono p-2 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="graph TD; A-->B; B-->C;"
          />
          <button
            onClick={handleCodeSubmit}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
          >
            Render
          </button>
        </div>
      ) : (
        <div className="p-4">
          <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Code size={12} />
            Mermaid Diagram
          </div>
          <div ref={diagramRef} className="mermaid-diagram">
            {!element.mermaidCode && (
              <div className="text-gray-500 text-sm p-8 text-center">
                Click edit to add Mermaid code
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}