import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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

// Clean initial state - no mock data, just empty canvas
const initialData: WhiteboardData = {
  elements: []
};

export default function Whiteboard() {
  const [data, setData] = useState<WhiteboardData>(initialData);
  const [hasJiraData, setHasJiraData] = useState(true); // Set to true to show whiteboard immediately
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { addNotification, notifications, removeNotification } = useNotifications();

  // Function to handle Jira data loaded
  const handleJiraDataLoaded = () => {
    if (!hasJiraData) {
      setHasJiraData(true);
      addNotification({
        type: 'success',
        message: '🎉 Jira Data Loaded! Your sprint data is ready for the meeting',
        duration: 3000
      });
    }
  };

  // Use refs to maintain stable function references
  const dataRef = useRef(data);
  const setDataRef = useRef(setData);
  
  // Update refs when data or setData changes
  useEffect(() => {
    dataRef.current = data;
    setDataRef.current = setData;
  }, [data, setData]);

  // Auto-detect when Jira data is loaded based on elements
  useEffect(() => {
    if (!hasJiraData && data.elements.length > 0) {
      // Check if we have any sticky notes (Jira tasks)
      const hasStickyNotes = data.elements.some(el => el.type === 'sticky');
      if (hasStickyNotes) {
        handleJiraDataLoaded();
      }
    }
  }, [data.elements, hasJiraData]);

  // Set up global functions for external access (only once)
  useEffect(() => {
    // Function to get current whiteboard data
    (window as any).getCurrentWhiteboardData = () => {
      console.log('getCurrentWhiteboardData called, returning:', dataRef.current);
      return dataRef.current;
    };

    // Function to set whiteboard data
    (window as any).setWhiteboardData = (newData: WhiteboardData) => {
      console.log('setWhiteboardData called with:', newData);
      setDataRef.current(newData);
    };

    // Function to update whiteboard from Gemini (legacy support)
    (window as any).updateWhiteboardFromGemini = (updates: any) => {
      console.log('updateWhiteboardFromGemini called with:', updates);
      if (updates && updates.elements) {
        const currentData = dataRef.current;
        setDataRef.current({
          ...currentData,
          elements: updates.elements
        });
        
        // Trigger Jira data loaded when elements are added
        if (updates.elements.length > 0) {
          handleJiraDataLoaded();
        }
      }
    };

    // Function to handle Jira data loaded (expose globally)
    (window as any).handleJiraDataLoaded = handleJiraDataLoaded;

    // Cleanup
    return () => {
      delete (window as any).updateWhiteboardFromGemini;
      delete (window as any).getCurrentWhiteboardData;
      delete (window as any).setWhiteboardData;
      delete (window as any).handleJiraDataLoaded;
    };
  }, []); // No dependencies - functions are stable and use refs for current values

  const updateElement = (id: string, updates: Partial<WhiteboardElement>) => {
    setData(prev => ({
      ...prev,
      elements: prev.elements.map(el => 
        el.id === id ? { ...el, ...updates } as WhiteboardElement : el
      )
    }));
  };

  // Function to reorganize all elements in their columns
  const reorganizeElements = () => {
    setData(prev => {
      const newElements = [...prev.elements];
      
      // Separate elements by column and type (updated boundaries)
      const todoElements = newElements.filter(el => 
        el.type === 'sticky' && el.x >= 40 && el.x <= 380
      ).sort((a, b) => a.y - b.y);
      
      const inProgressElements = newElements.filter(el => 
        el.type === 'sticky' && el.x >= 420 && el.x <= 760
      ).sort((a, b) => a.y - b.y);
      
      const doneElements = newElements.filter(el => 
        el.type === 'sticky' && el.x >= 800 && el.x <= 1140
      ).sort((a, b) => a.y - b.y);
      
      const otherElements = newElements.filter(el => 
        el.type !== 'sticky' || (el.x < 40 || (el.x > 380 && el.x < 420) || (el.x > 760 && el.x < 800) || el.x > 1140)
      );
      
      // Reorganize each column with proper spacing
      let startY = 200; // Updated to account for new header height
      const spacing = 100; // Increased spacing for better visual appeal
      
      // Reorganize TODO column
      todoElements.forEach((el, index) => {
        if (el.type === 'sticky') {
          el.x = 100; // Centered in new column
          el.y = startY + (index * spacing);
          el.color = 'yellow';
        }
      });
      
      // Reorganize IN PROGRESS column
      inProgressElements.forEach((el, index) => {
        if (el.type === 'sticky') {
          el.x = 480; // Centered in new column
          el.y = startY + (index * spacing);
          el.color = 'orange';
        }
      });
      
      // Reorganize DONE column
      doneElements.forEach((el, index) => {
        if (el.type === 'sticky') {
          el.x = 860; // Centered in new column
          el.y = startY + (index * spacing);
          el.color = 'green';
        }
      });
      
      return {
        ...prev,
        elements: [...todoElements, ...inProgressElements, ...doneElements, ...otherElements]
      };
    });
  };

  const addElement = (type: string) => {
    let newElement: WhiteboardElement;
    
    // Helper function to get next available Y position in a column
    const getNextYPosition = (columnX: number) => {
      // Define column boundaries more precisely (updated for new layout)
      let columnStart, columnEnd;
      if (columnX <= 210) { // TODO column
        columnStart = 40;
        columnEnd = 380;
      } else if (columnX >= 420 && columnX <= 580) { // IN PROGRESS column
        columnStart = 420;
        columnEnd = 760;
      } else { // DONE column
        columnStart = 800;
        columnEnd = 1140;
      }
      
      // Get all elements in this column, sorted by Y position
      const elementsInColumn = data.elements.filter(el => 
        el.x >= columnStart && el.x <= columnEnd && el.y >= 120 && el.type === 'sticky'
      ).sort((a, b) => a.y - b.y);
      
      // Start from base position (after column header)
      let nextY = 200; // Updated for new header height
      
      // Find the next available position
      for (const element of elementsInColumn) {
        if (element.y >= nextY) {
          nextY = Math.max(nextY, element.y + 100); // Increased spacing
        }
      }
      
      return nextY;
    };
    
    // Determine Kanban column based on type or default to TODO (updated positions)
    const getKanbanPosition = (status: 'todo' | 'inprogress' | 'done' = 'todo') => {
      switch (status) {
        case 'todo':
          return { x: 100, color: 'yellow' }; // Centered in TODO column
        case 'inprogress':
          return { x: 480, color: 'orange' }; // Centered in IN PROGRESS column
        case 'done':
          return { x: 860, color: 'green' }; // Centered in DONE column
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
    
    // Log the current state for debugging
    console.log("📋 Current Kanban Board JSON Structure:");
    console.log("=====================================");
    setTimeout(() => {
      setData(currentData => {
        // Organize elements by column for display (updated boundaries)
        const todoItems = currentData.elements.filter(el => 
          el.type === 'sticky' && el.x >= 40 && el.x <= 380
        ).sort((a, b) => a.y - b.y);
        
        const inProgressItems = currentData.elements.filter(el => 
          el.type === 'sticky' && el.x >= 420 && el.x <= 760
        ).sort((a, b) => a.y - b.y);
        
        const doneItems = currentData.elements.filter(el => 
          el.type === 'sticky' && el.x >= 800 && el.x <= 1140
        ).sort((a, b) => a.y - b.y);
        
        const otherItems = currentData.elements.filter(el => 
          el.type !== 'sticky' || (el.x < 40 || (el.x > 380 && el.x < 420) || (el.x > 760 && el.x < 800) || el.x > 1140)
        );
        
        console.log("🟡 TODO Column:", todoItems.map(item => ({ id: item.id, text: item.type === 'sticky' ? item.text : '', x: item.x, y: item.y })));
        console.log("🟠 IN PROGRESS Column:", inProgressItems.map(item => ({ id: item.id, text: item.type === 'sticky' ? item.text : '', x: item.x, y: item.y })));
        console.log("🟢 DONE Column:", doneItems.map(item => ({ id: item.id, text: item.type === 'sticky' ? item.text : '', x: item.x, y: item.y })));
        console.log("⚪ Other Elements:", otherItems.map(item => ({ id: item.id, type: item.type, x: item.x, y: item.y })));
        console.log("=====================================");
        
        return currentData;
      });
    }, 100);
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
    <div className="h-screen w-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 overflow-hidden">
      {/* <Toolbar onAddElement={addElement} /> */}
      <GeminiLiveControls />
      
      {/* Whiteboard is always visible now */}
      <div
        ref={containerRef}
        id="whiteboard-container"
        className="h-full w-full relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{
          opacity: 1, // Always fully visible
          pointerEvents: 'auto' // Always interactive
        }}
      >
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Enhanced Grid background with subtle pattern */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.15) 1px, transparent 0)
              `,
              backgroundSize: '24px 24px',
              backgroundPosition: '0 0'
            }}
          />
          
          {/* Kanban Columns Background - Enhanced Design */}
          <div className="absolute inset-0">
            {/* To Do Column - Enhanced */}
            <div 
              className="absolute bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl shadow-xl backdrop-blur-sm transition-all hover:shadow-2xl"
              style={{
                left: '40px',
                top: '120px', 
                width: '340px',
                height: '680px',
                boxShadow: '0 10px 40px rgba(245, 158, 11, 0.1)'
              }}
            >
              <div className="absolute top-6 left-6 right-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse"></div>
                    <h2 className="text-amber-800 text-xl font-bold tracking-wide">📋 TO DO</h2>
                  </div>
                  <span className="text-xs bg-amber-200 text-amber-800 px-3 py-1.5 rounded-full font-semibold shadow-sm">
                    {data.elements.filter(el => el.x >= 40 && el.x <= 380 && el.y >= 120).length}
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200"></div>
              </div>
            </div>
            
            {/* In Progress Column - Enhanced */}
            <div 
              className="absolute bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl shadow-xl backdrop-blur-sm transition-all hover:shadow-2xl"
              style={{
                left: '420px',
                top: '120px',
                width: '340px', 
                height: '680px',
                boxShadow: '0 10px 40px rgba(59, 130, 246, 0.1)'
              }}
            >
              <div className="absolute top-6 left-6 right-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                    <h2 className="text-blue-800 text-xl font-bold tracking-wide">🔄 IN PROGRESS</h2>
                  </div>
                  <span className="text-xs bg-blue-200 text-blue-800 px-3 py-1.5 rounded-full font-semibold shadow-sm">
                    {data.elements.filter(el => el.x >= 420 && el.x <= 760 && el.y >= 120).length}
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200"></div>
              </div>
            </div>
            
            {/* Done Column - Enhanced */}
            <div 
              className="absolute bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl shadow-xl backdrop-blur-sm transition-all hover:shadow-2xl"
              style={{
                left: '800px',
                top: '120px',
                width: '340px',
                height: '680px',
                boxShadow: '0 10px 40px rgba(16, 185, 129, 0.1)'
              }}
            >
              <div className="absolute top-6 left-6 right-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                    <h2 className="text-emerald-800 text-xl font-bold tracking-wide">✅ DONE</h2>
                  </div>
                  <span className="text-xs bg-emerald-200 text-emerald-800 px-3 py-1.5 rounded-full font-semibold shadow-sm">
                    {data.elements.filter(el => el.x >= 800 && el.x <= 1140 && el.y >= 120).length}
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200"></div>
              </div>
            </div>
          </div>
          
          {/* Connections */}
          {renderConnections()}
          
          {/* Elements */}
          {data.elements.map(renderElement)}
        </div>
      </div>

      {/* Enhanced Zoom and Control Panel */}
      {/* <div className="fixed bottom-6 left-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-4 flex flex-col gap-3 border border-white/20">
        <div className="text-center">
          <div className="text-xs text-gray-500 font-medium mb-2">CONTROLS</div>
          <button
            onClick={reorganizeElements}
            className="w-full px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 mb-2"
            title="Reorganize Kanban columns"
          >
            📋 Auto Organize
          </button> */}
          
          {/* Test button to manually hide welcome screen - removed since welcome screen is gone */}
          {/* {false && (
            <button
              onClick={handleJiraDataLoaded}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              title="Simulate Jira data loaded"
            >
              🎯 Test: Hide Welcome
            </button>
          )}
        </div>
        
        <div className="h-px bg-gray-200"></div>
        
        <div className="text-center">
          <div className="text-xs text-gray-500 font-medium mb-3">ZOOM</div>
          <button
            onClick={() => setZoom(Math.min(zoom + 0.25, 3))}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 text-lg font-bold shadow-md hover:shadow-lg mb-2"
          >
            +
          </button>
          <div className="text-sm font-bold text-gray-700 py-2 px-3 bg-gray-100 rounded-lg">
            {Math.round(zoom * 100)}%
          </div>
          <button
            onClick={() => setZoom(Math.max(zoom - 0.25, 0.25))}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 text-lg font-bold shadow-md hover:shadow-lg mt-2"
          >
            −
          </button>
        </div>
      </div> */}

      <JsonEditor data={data} onDataChange={setData} />
      <NotificationSystem notifications={notifications} onRemove={removeNotification} />
    </div>
  );
}