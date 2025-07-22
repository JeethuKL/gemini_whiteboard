import { EventEmitter } from "eventemitter3";
import { getAudioContext, arrayBufferToBase64 } from "./audio-utils";
import {
  audioProcessorWorklet,
  volumeMeterWorklet,
  createWorkletFromSource,
} from "./audio-worklets";

export class AudioRecorder extends EventEmitter {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private recordingWorklet: AudioWorkletNode | null = null;
  private volumeWorklet: AudioWorkletNode | null = null;
  private isRecording = false;
  private starting: Promise<void> | null = null;

  constructor(private sampleRate = 16000) {
    super();
  }

  async start(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Could not request user media");
    }

    this.starting = new Promise(async (resolve, reject) => {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: this.sampleRate,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        this.audioContext = await getAudioContext({
          sampleRate: this.sampleRate,
        });
        this.source = this.audioContext.createMediaStreamSource(this.stream);

        // Add audio processing worklet
        const processorWorkletName = "audio-processor-worklet";
        const processorSrc = createWorkletFromSource(
          processorWorkletName,
          audioProcessorWorklet
        );
        await this.audioContext.audioWorklet.addModule(processorSrc);

        this.recordingWorklet = new AudioWorkletNode(
          this.audioContext,
          processorWorkletName
        );

        this.recordingWorklet.port.onmessage = (ev: MessageEvent) => {
          const arrayBuffer = ev.data.data.int16arrayBuffer;
          if (arrayBuffer) {
            const base64String = arrayBufferToBase64(arrayBuffer);
            this.emit("data", base64String);
          }
        };

        this.source.connect(this.recordingWorklet);

        // Add volume meter worklet
        const volumeWorkletName = "volume-meter-worklet";
        const volumeSrc = createWorkletFromSource(
          volumeWorkletName,
          volumeMeterWorklet
        );
        await this.audioContext.audioWorklet.addModule(volumeSrc);

        this.volumeWorklet = new AudioWorkletNode(
          this.audioContext,
          volumeWorkletName
        );
        this.volumeWorklet.port.onmessage = (ev: MessageEvent) => {
          this.emit("volume", ev.data.volume);
        };

        this.source.connect(this.volumeWorklet);
        this.isRecording = true;
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        this.starting = null;
      }
    });

    return this.starting;
  }

  stop(): void {
    const handleStop = () => {
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }

      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }

      this.recordingWorklet = null;
      this.volumeWorklet = null;
      this.isRecording = false;
    };

    if (this.starting) {
      this.starting.then(handleStop).catch(() => handleStop());
      return;
    }

    handleStop();
  }

  get recording(): boolean {
    return this.isRecording;
  }
}
