import React, { useState, useRef, useEffect } from 'react';
import { WhiteboardData, WhiteboardElement } from '../types/whiteboard';
import StickyNote from './StickyNote';
import FlowNode from './FlowNode';
import MermaidDiagram from './MermaidDiagram';
import EmbeddedLink from './EmbeddedLink';
import ConnectionLine from './ConnectionLine';
import Toolbar from './Toolbar';
import JsonEditor from './JsonEditor';
import GeminiLiveControls from './GeminiLiveControls';
import { processWhiteboardToolCall } from '../tools/whiteboard-tools';
import { NotificationSystem, useNotifications } from './NotificationSystem';

const initialData: WhiteboardData = {
  elements: [
    // Project Header
    {
      type: 'sticky',
      id: 'project-header',
      x: 200,
      y: 50,
      text: '🚀 Digital Whiteboard App - Sprint 3 Q1 2025\n🎯 Goal: AI Integration & Kanban Features',
      color: 'blue'
    },

    // TO DO Column Tasks (x: ~100)
    {
      type: 'sticky',
      id: 'todo-1',
      x: 100,
      y: 180,
      text: '🔧 Add voice recognition features',
      color: 'yellow'
    },
    {
      type: 'sticky',
      id: 'todo-2',
      x: 100,
      y: 270,
      text: '📱 Mobile responsive design',
      color: 'yellow'
    },
    {
      type: 'sticky',
      id: 'todo-3',
      x: 100,
      y: 360,
      text: '🔐 User authentication system',
      color: 'yellow'
    },

    // IN PROGRESS Column Tasks (x: ~460)
    {
      type: 'sticky',
      id: 'inprogress-1',
      x: 460,
      y: 180,
      text: '🤖 Gemini Live integration',
      color: 'orange'
    },
    {
      type: 'sticky',
      id: 'inprogress-2',
      x: 460,
      y: 270,
      text: '🎨 UI/UX improvements',
      color: 'orange'
    },

    // DONE Column Tasks (x: ~820)
    {
      type: 'sticky',
      id: 'done-1',
      x: 820,
      y: 180,
      text: '✅ Basic whiteboard functionality',
      color: 'green'
    },
    {
      type: 'sticky',
      id: 'done-2',
      x: 820,
      y: 270,
      text: '🔗 Real-time collaboration setup',
      color: 'green'
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

  // Set up global function for Gemini tool calls
  useEffect(() => {
    (window as any).updateWhiteboardFromGemini = (toolCallArgs: any) => {
      console.log("🎨 Updating whiteboard from Gemini:", toolCallArgs);
      
      // Use setData with function to get current state
      setData(currentData => {
        const newData = processWhiteboardToolCall(currentData, toolCallArgs);
        console.log("📋 Updated whiteboard data:", newData);
        return newData;
      });
    };

    // Cleanup
    return () => {
      delete (window as any).updateWhiteboardFromGemini;
    };
  }, []); // Remove data dependency to avoid stale closures

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
    
    // Helper function to get next available Y position in a column
    const getNextYPosition = (columnX: number) => {
      const elementsInColumn = data.elements.filter(el => 
        el.x >= columnX - 50 && el.x <= columnX + 250
      );
      const maxY = elementsInColumn.reduce((max, el) => Math.max(max, el.y), 160);
      return maxY + 90; // Add spacing between elements
    };
    
    // Determine Kanban column based on type or default to TODO
    const getKanbanPosition = (status: 'todo' | 'inprogress' | 'done' = 'todo') => {
      switch (status) {
        case 'todo':
          return { x: 100, color: 'yellow' };
        case 'inprogress':
          return { x: 460, color: 'orange' };
        case 'done':
          return { x: 820, color: 'green' };
        default:
          return { x: 100, color: 'yellow' };
      }
    };
    
    if (type === 'sticky') {
      // Default new sticky notes to TODO column
      const position = getKanbanPosition('todo');
      newElement = {
        id: `${type}-${Date.now()}`,
        x: position.x,
        y: getNextYPosition(position.x),
        type: 'sticky',
        text: 'New task',
        color: position.color
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
    // Remove preventDefault to avoid passive event listener warning
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
          
          {/* Kanban Columns Background */}
          <div className="absolute inset-0">
            {/* To Do Column */}
            <div 
              className="absolute bg-yellow-50/80 border-2 border-dashed border-yellow-300 rounded-xl shadow-sm backdrop-blur-sm"
              style={{
                left: '60px',
                top: '140px', 
                width: '320px',
                height: '650px'
              }}
            >
              <div className="absolute top-4 left-4 text-yellow-700 text-lg font-bold flex items-center gap-2">
                📋 TO DO
                <span className="text-xs bg-yellow-200 px-2 py-1 rounded-full">
                  {data.elements.filter(el => el.x >= 60 && el.x <= 380 && el.y >= 140).length}
                </span>
              </div>
            </div>
            
            {/* In Progress Column */}
            <div 
              className="absolute bg-orange-50/80 border-2 border-dashed border-orange-300 rounded-xl shadow-sm backdrop-blur-sm"
              style={{
                left: '420px',
                top: '140px',
                width: '320px', 
                height: '650px'
              }}
            >
              <div className="absolute top-4 left-4 text-orange-700 text-lg font-bold flex items-center gap-2">
                🔄 IN PROGRESS
                <span className="text-xs bg-orange-200 px-2 py-1 rounded-full">
                  {data.elements.filter(el => el.x >= 420 && el.x <= 740 && el.y >= 140).length}
                </span>
              </div>
            </div>
            
            {/* Done Column */}
            <div 
              className="absolute bg-green-50/80 border-2 border-dashed border-green-300 rounded-xl shadow-sm backdrop-blur-sm"
              style={{
                left: '780px',
                top: '140px',
                width: '320px',
                height: '650px'
              }}
            >
              <div className="absolute top-4 left-4 text-green-700 text-lg font-bold flex items-center gap-2">
                ✅ DONE
                <span className="text-xs bg-green-200 px-2 py-1 rounded-full">
                  {data.elements.filter(el => el.x >= 780 && el.x <= 1100 && el.y >= 140).length}
                </span>
              </div>
            </div>
          </div>
          
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