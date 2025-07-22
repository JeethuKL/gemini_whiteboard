import React, { useState, useEffect } from 'react';
import { Code, Copy, Download, Upload, X } from 'lucide-react';
import { WhiteboardData } from '../types/whiteboard';

interface JsonEditorProps {
  data: WhiteboardData;
  onDataChange: (data: WhiteboardData) => void;
}

export default function JsonEditor({ data, onDataChange }: JsonEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setJsonText(JSON.stringify(data, null, 2));
  }, [data]);

  const handleJsonChange = (value: string) => {
    setJsonText(value);
    try {
      const parsed = JSON.parse(value);
      if (parsed.elements && Array.isArray(parsed.elements)) {
        onDataChange(parsed);
        setIsValid(true);
      } else {
        setIsValid(false);
      }
    } catch (error) {
      setIsValid(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonText);
  };

  const downloadJson = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whiteboard.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        try {
          const parsed = JSON.parse(content);
          if (parsed.elements && Array.isArray(parsed.elements)) {
            onDataChange(parsed);
            setJsonText(content);
            setIsValid(true);
          }
        } catch (error) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-30"
        title="JSON Editor"
      >
        <Code size={20} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">JSON Editor</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                  title="Copy JSON"
                >
                  <Copy size={16} />
                </button>
                <button
                  onClick={downloadJson}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                  title="Download JSON"
                >
                  <Download size={16} />
                </button>
                <label className="p-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer" title="Upload JSON">
                  <Upload size={16} />
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4">
              <div className="h-full relative">
                <textarea
                  value={jsonText}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  className={`w-full h-full resize-none font-mono text-sm p-4 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 ${
                    isValid ? 'border-gray-300' : 'border-red-500'
                  }`}
                  placeholder="Enter JSON data..."
                />
                {!isValid && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    Invalid JSON
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                <strong>Tip:</strong> Edit the JSON to modify elements programmatically. Changes sync automatically with the whiteboard.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}