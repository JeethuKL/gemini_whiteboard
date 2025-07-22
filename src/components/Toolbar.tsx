import React from 'react';
import { StickyNote, Square, Diamond, Circle, Code, Link, Plus } from 'lucide-react';

interface ToolbarProps {
  onAddElement: (type: string) => void;
}

export default function Toolbar({ onAddElement }: ToolbarProps) {
  const tools = [
    { id: 'sticky', icon: StickyNote, label: 'Sticky Note', color: 'bg-yellow-500' },
    { id: 'flow-rectangle', icon: Square, label: 'Rectangle Node', color: 'bg-blue-500' },
    { id: 'flow-diamond', icon: Diamond, label: 'Diamond Node', color: 'bg-green-500' },
    { id: 'flow-circle', icon: Circle, label: 'Circle Node', color: 'bg-purple-500' },
    { id: 'mermaid', icon: Code, label: 'Mermaid Diagram', color: 'bg-indigo-500' },
    { id: 'embed', icon: Link, label: 'Embed Link', color: 'bg-red-500' },
  ];

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex gap-2 z-30">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onAddElement(tool.id)}
          className={`p-3 rounded-lg ${tool.color} text-white hover:opacity-90 transition-all duration-200 hover:scale-105 group relative`}
          title={tool.label}
        >
          <tool.icon size={20} />
          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            {tool.label}
          </div>
        </button>
      ))}
    </div>
  );
}