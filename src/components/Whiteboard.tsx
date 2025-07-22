import { useState, useRef } from 'react';
import { WhiteboardData, WhiteboardElement } from '../types/whiteboard';
import StickyNote from './StickyNote';
import FlowNode from './FlowNode';
import MermaidDiagram from './MermaidDiagram';
import EmbeddedLink from './EmbeddedLink';
import ConnectionLine from './ConnectionLine';
import Toolbar from './Toolbar';
import JsonEditor from './JsonEditor';
import GeminiLiveControls from './GeminiLiveControls';

const initialData: WhiteboardData = {
  elements: [
    {
      type: 'sticky',
      id: 'note-1',
      x: 100,
      y: 150,
      text: 'Welcome to the whiteboard! 🎨',
      color: 'yellow'
    },
    {
      type: 'flow-node',
      id: 'start',
      x: 300,
      y: 200,
      label: 'Start',
      shape: 'rectangle',
      connections: ['decision']
    },
    {
      type: 'flow-node',
      id: 'decision',
      x: 500,
      y: 250,
      label: 'Valid?',
      shape: 'diamond',
      connections: ['end']
    },
    {
      type: 'flow-node',
      id: 'end',
      x: 700,
      y: 200,
      label: 'End',
      shape: 'circle',
      connections: []
    },
    {
      type: 'mermaid',
      id: 'mermaid-1',
      x: 100,
      y: 350,
      mermaidCode: 'graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Success]\n    B -->|No| D[Failure]'
    },
    {
      type: 'embed',
      id: 'embed-1',
      x: 800,
      y: 100,
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      embedType: 'iframe'
    }
  ]
};

export default function Whiteboard() {
  const [data, setData] = useState<WhiteboardData>(initialData);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const updateElement = (id: string, updates: Partial<WhiteboardElement>) => {
    setData(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === id ? { ...el, ...updates } as WhiteboardElement : el
      )
    }));
  };

  const addElement = (type: string) => {
    let newElement: WhiteboardElement;
    
    if (type === 'sticky') {
      newElement = {
        id: `${type}-${Date.now()}`,
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
        type: 'sticky',
        text: 'New note',
        color: 'yellow'
      };
    } else if (type.startsWith('flow-')) {
      newElement = {
        id: `${type}-${Date.now()}`,
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
        type: 'flow-node',
        label: 'New Node',
        shape: type.split('-')[1] as 'rectangle' | 'diamond' | 'circle',
        connections: []
      };
    } else if (type === 'mermaid') {
      newElement = {
        id: `${type}-${Date.now()}`,
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
        type: 'mermaid',
        mermaidCode: 'graph TD\n    A --> B'
      };
    } else if (type === 'embed') {
      newElement = {
        id: `${type}-${Date.now()}`,
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
        type: 'embed',
        url: '',
        embedType: 'iframe'
      };
    } else {
      return; // Unknown type, don't add anything
    }

    setData(prev => ({
      ...prev,
      elements: [...prev.elements, newElement]
    }));
  };

  const handleDragStart = (id: string) => {
    setDraggedElement(id);
  };

  const handleDrag = (id: string, x: number, y: number) => {
    updateElement(id, { x, y });
  };

  const handleDragEnd = () => {
    setDraggedElement(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newZoom = Math.min(Math.max(zoom + delta, 0.25), 3);
    setZoom(newZoom);
  };

  const renderElement = (element: WhiteboardElement) => {
    switch (element.type) {
      case 'sticky':
        return (
          <StickyNote
            key={element.id}
            element={element}
            onUpdate={updateElement}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
          />
        );
      case 'flow-node':
        return (
          <FlowNode
            key={element.id}
            element={element}
            onUpdate={updateElement}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
          />
        );
      case 'mermaid':
        return (
          <MermaidDiagram
            key={element.id}
            element={element}
            onUpdate={updateElement}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
          />
        );
      case 'embed':
        return (
          <EmbeddedLink
            key={element.id}
            element={element}
            onUpdate={updateElement}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
          />
        );
      default:
        return null;
    }
  };

  const renderConnections = () => {
    const connections: JSX.Element[] = [];
    
    data.elements.forEach(element => {
      if (element.type === 'flow-node' && element.connections) {
        element.connections.forEach(targetId => {
          const target = data.elements.find(el => el.id === targetId);
          if (target) {
            connections.push(
              <ConnectionLine
                key={`${element.id}-${targetId}`}
                from={element}
                to={target}
              />
            );
          }
        });
      }
    });

    return connections;
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      <Toolbar onAddElement={addElement} />
      <GeminiLiveControls />
      
      <div
        ref={containerRef}
        id="whiteboard-container"
        className="h-full w-full relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Grid background */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0'
            }}
          />
          
          {/* Connections */}
          {renderConnections()}
          
          {/* Elements */}
          {data.elements.map(renderElement)}
        </div>
      </div>

      {/* Zoom controls */}
      <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-2 flex flex-col gap-2">
        <button
          onClick={() => setZoom(Math.min(zoom + 0.25, 3))}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          +
        </button>
        <span className="text-sm font-medium px-2">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom(Math.max(zoom - 0.25, 0.25))}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          -
        </button>
      </div>

      <JsonEditor data={data} onDataChange={setData} />
    </div>
  );
}