import { useState, useEffect } from 'react';
import { MicOff, PhoneOff, Settings, Volume2, HelpCircle, RefreshCw } from 'lucide-react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import FacilitronOrb from './FacilitronOrb';

interface GeminiLiveControlsProps {
  apiKey?: string;
}

export default function GeminiLiveControls({ apiKey }: GeminiLiveControlsProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [localApiKey, setLocalApiKey] = useState('');
  const [isKeySet, setIsKeySet] = useState(false);

  // Initialize API key from various sources
  useEffect(() => {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    const savedKey = localStorage.getItem('gemini-api-key');
    const effectiveKey = apiKey || envKey || savedKey || '';
    
    console.log("Setting API key:", effectiveKey.substring(0, 10) + "...");
    setLocalApiKey(effectiveKey);
    setIsKeySet(!!effectiveKey);
  }, [apiKey]);

  const geminiLive = useGeminiLive({ 
    apiKey: localApiKey
  });

  const { state, connect, disconnect, startRecording, stopRecording, volume, updateSystemInstructionsWithJiraData } = geminiLive;

  // Auto-update system instructions when connected (one-time only)
  useEffect(() => {
    const updateInstructions = async () => {
      if (state.isConnected) {
        console.log("🔗 Connection established, updating system instructions with Jira data...");
        
        const success = await updateSystemInstructionsWithJiraData();
        
        if (success) {
          console.log("✅ System instructions updated successfully! New instructions will apply on next reconnection.");
        }
      }
    };

    // Only run this on the initial connection
    if (state.isConnected) {
      const hasRunUpdate = sessionStorage.getItem('gemini-jira-update-done');
      if (!hasRunUpdate) {
        sessionStorage.setItem('gemini-jira-update-done', 'true');
        updateInstructions();
      }
    }
  }, [state.isConnected, updateSystemInstructionsWithJiraData]);

  const handleConnect = async () => {
    if (!localApiKey) {
      alert('Please set your Gemini API key first');
      setShowSettings(true);
      return;
    }
    
    console.log("Connecting with API key:", localApiKey.substring(0, 10) + "...");
    try {
      await connect();
    } catch (error) {
      console.error('Failed to connect:', error);
      alert('Failed to connect to Gemini Live. Please check your API key.');
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleRefreshJiraData = async () => {
    console.log("🔄 Manually refreshing Jira data...");
    const wasConnected = state.isConnected;
    
    // Disconnect if connected to allow new instructions to take effect
    if (wasConnected) {
      console.log("🔌 Disconnecting to apply new instructions...");
      disconnect();
      // Wait for disconnection
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const success = await updateSystemInstructionsWithJiraData();
    
    if (success) {
      // Trigger the whiteboard to hide the welcome screen
      if (typeof (window as any).handleJiraDataLoaded === 'function') {
        (window as any).handleJiraDataLoaded();
      }
      
      if (wasConnected) {
        alert('✅ Jira data refreshed! Please reconnect to apply the updated team information.');
      } else {
        alert('✅ Jira data refreshed! You can now connect with the latest team information.');
      }
    } else {
      alert('❌ Failed to refresh Jira data. Please check your Jira proxy server.');
    }
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const handleSaveApiKey = () => {
    if (localApiKey.trim()) {
      setIsKeySet(true);
      setShowSettings(false);
      // Save to localStorage
      localStorage.setItem('gemini-api-key', localApiKey);
    }
  };

  const getStatusColor = () => {
    if (state.error) return 'text-red-500';
    if (state.isConnected) return 'text-green-500';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (state.error) return `Error: ${state.error}`;
    if (state.isConnected) return 'Connected';
    return 'Disconnected';
  };

  return (
    <div className="fixed top-4 right-4 bg-white rounded-xl shadow border border-gray-300 p-4 z-30 min-w-[280px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <FacilitronOrb size={14} />
          Facilitron 
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            title="Help"
          >
            <HelpCircle size={16} className="text-gray-600" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            title="Settings"
          >
            <Settings size={16} className="text-gray-600" />
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="mb-4 p-3 bg-white rounded-lg border">
          <h4 className="font-medium text-blue-800 mb-2">How to use Spark AI with Jira:</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>1. Set your API key in settings</li>
            <li>2. Click "Connect" to start session</li>
            <li>3. Click "Start Speaking" and talk</li>
            <li>4. Spark will sync with your Jira project</li>
          </ul>
          <div className="mt-3 p-2 bg-gray-100 rounded">
            <p className="text-xs font-medium text-gray-800 mb-1">Try these commands:</p>
            <ul className="text-xs text-gray-700 space-y-0.5">
              <li>• "Sync the Jira board"</li>
              <li>• "Show me the team workload"</li>
              <li>• "Start a standup meeting"</li>
              <li>• "What's in our current sprint?"</li>
            </ul>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="mb-4 p-3 bg-white rounded-lg border">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Facilitron API Key
          </label>
          <input
            type="password"
            value={localApiKey}
            onChange={(e) => setLocalApiKey(e.target.value)}
            placeholder="Enter your Facilitron API key"
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-gray-800 focus:border-transparent"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSaveApiKey}
              className="px-3 py-1 bg-black text-white text-sm rounded-lg hover:opacity-90 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Get your API key from{' '}
            <a 
              href="https://aistudio.google.com/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-800 underline"
            >
              Google AI Studio
            </a>
          </p>
        </div>
      )}

      <div className="space-y-3">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Status:</span>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Connection Controls */}
        <div className="flex gap-2">
          {!state.isConnected ? (
            <button
              onClick={handleConnect}
              disabled={!isKeySet}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <FacilitronOrb size={14} />
              Connect
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 transition-colors"
            >
              <PhoneOff size={16} />
              Disconnect
            </button>
          )}
        </div>

        {/* Jira Data Refresh Button - Only show when connected */}
        {state.isConnected && (
          <div className="flex gap-2">
            <button
              onClick={handleRefreshJiraData}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-black text-white rounded-lg hover:opacity-90 transition-colors text-sm"
            >
              <RefreshCw size={14} />
              Refresh Jira Data
            </button>
          </div>
        )}

        {/* Recording Controls */}
        {state.isConnected && (
          <div className="flex gap-2">
            {!state.isRecording ? (
              <button
                onClick={handleStartRecording}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 transition-colors"
              >
                <FacilitronOrb size={14} />
                Start Speaking
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 transition-colors"
              >
                <MicOff size={16} />
                Stop Speaking
              </button>
            )}
          </div>
        )}

        {/* Volume Indicator */}
        {state.isRecording && (
          <div className="flex items-center gap-2">
            <Volume2 size={14} className="text-gray-600" />
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-black transition-all duration-100"
                style={{ width: `${Math.min(volume * 100 * 10, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Activity Indicators */}
        {state.isConnected && (
          <div className="flex justify-center gap-4 text-xs">
            <div className={`flex items-center gap-1 ${state.isRecording ? 'text-red-500' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${state.isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
              Recording
            </div>
            <div className={`flex items-center gap-1 ${state.isSpeaking ? 'text-blue-500' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${state.isSpeaking ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
              AI Speaking
            </div>
          </div>
        )}

        {/* Latest Response */}
        {state.response && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-600 font-medium mb-1">Latest Response:</p>
            <p className="text-sm text-blue-800">{state.response}</p>
          </div>
        )}
      </div>
    </div>
  );
}
