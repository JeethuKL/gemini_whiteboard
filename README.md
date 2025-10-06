# Gemini Whiteboard with Live AI Assistant


A collaborative digital whiteboard with integrated Gemini Live API support for real-time voice interaction with AI.

## Features

- **Interactive Whiteboard**: Create sticky notes, flow diagrams, Mermaid charts, and embed content
- **Gemini Live Integration**: Real-time voice conversation with Google's Gemini AI
- **Voice Controls**: Start/stop recording, connect/disconnect from Gemini Live
- **Audio Feedback**: Volume indicators and speaking status
- **Persistent API Key**: Securely store your Gemini API key locally

## Getting Started

### Prerequisites

1. **Node.js** (v16 or higher)
2. **Gemini API Key** - Get yours from [Google AI Studio](https://aistudio.google.com/apikey)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gemini_whiteboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173` (or the port shown in terminal)

### Setting Up Gemini Live

1. **Get API Key**: Visit [Google AI Studio](https://aistudio.google.com/apikey) to create a free Gemini API key

2. **Configure API Key**: 
   - Click the settings icon (⚙️) in the Gemini Live panel (top-right corner)
   - Enter your API key in the input field
   - Click "Save" - the key will be stored securely in your browser's local storage

3. **Connect to Gemini Live**:
   - Click "Connect" in the Gemini Live panel
   - Wait for the status to show "Connected"

4. **Start Voice Interaction**:
   - Click "Start Speaking" to begin recording your voice
   - Speak your question or request about the whiteboard content
   - Click "Stop Speaking" when done
   - Listen to Gemini's audio response

## Usage

### Whiteboard Features

- **Sticky Notes**: Add colorful notes with text
- **Flow Nodes**: Create flowcharts with rectangles, diamonds, and circles
- **Mermaid Diagrams**: Add complex diagrams using Mermaid syntax
- **Embedded Content**: Embed videos, websites, or other media
- **Connections**: Draw lines between flow nodes
- **Pan & Zoom**: Navigate large whiteboards with mouse controls

### Gemini Live Features

- **Voice Input**: Natural speech recognition for questions and commands
- **Contextual Responses**: AI understands your whiteboard content
- **Audio Output**: High-quality text-to-speech responses
- **Real-time Indicators**: Visual feedback for recording and AI speaking status
- **Volume Monitoring**: See your microphone input levels

### Example Interactions

- "Explain this flowchart to me"
- "Help me brainstorm ideas for a marketing strategy"
- "What's missing from this diagram?"
- "Create a timeline for this project"
- "Suggest improvements to this process"

## Technical Details

### Dependencies

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **TailwindCSS**: Styling
- **@google/genai**: Google Generative AI SDK
- **Lucide React**: Icons
- **Mermaid**: Diagram rendering

### Architecture

- **Audio Processing**: Web Audio API with AudioWorklets for real-time audio processing
- **WebSocket Connection**: Real-time bidirectional communication with Gemini Live API
- **State Management**: React hooks for managing connection and recording state
- **Type Safety**: Full TypeScript implementation with proper type definitions

### Audio Configuration

- **Sample Rate**: 16kHz for input, 24kHz for output
- **Format**: PCM16 audio encoding
- **Buffer Size**: Optimized for low-latency real-time communication
- **Echo Cancellation**: Enabled for better voice quality

## Troubleshooting

### Common Issues

1. **"Failed to connect"**: 
   - Verify your API key is correct
   - Check your internet connection
   - Ensure you have a valid Gemini API quota

2. **"Failed to start recording"**:
   - Grant microphone permissions when prompted
   - Check your browser's microphone settings
   - Ensure no other app is using the microphone exclusively

3. **No audio output**:
   - Check your system volume and browser audio settings
   - Ensure the page has permission to play audio
   - Try clicking somewhere on the page to enable audio context

### Browser Compatibility

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Partial support (some audio features may be limited)

### API Limits

- Free tier includes generous limits for testing
- Monitor your usage in [Google AI Studio](https://aistudio.google.com/)
- Consider upgrading to paid tier for production use

## Privacy & Security

- **API Key Storage**: Keys are stored locally in your browser only
- **Audio Data**: Processed locally and sent securely to Google's servers
- **No Data Persistence**: Conversations are not stored permanently
- **HTTPS Required**: Secure connection required for microphone access

## Development

### Building for Production

```bash
npm run build
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npx tsc --noEmit
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the troubleshooting section above
- Review [Gemini API documentation](https://ai.google.dev/gemini-api/docs)
- Create an issue in the repository

---

Enjoy your AI-powered whiteboard experience! 🎨🤖
