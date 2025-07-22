export const audioProcessorWorklet = `
class AudioProcessingWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(2048);
    this.bufferWriteIndex = 0;
  }

  process(inputs) {
    if (inputs[0].length) {
      const channel0 = inputs[0][0];
      this.processChunk(channel0);
    }
    return true;
  }

  sendAndClearBuffer() {
    this.port.postMessage({
      event: "chunk",
      data: {
        int16arrayBuffer: this.buffer.slice(0, this.bufferWriteIndex).buffer,
      },
    });
    this.bufferWriteIndex = 0;
  }

  processChunk(float32Array) {
    const l = float32Array.length;
    
    for (let i = 0; i < l; i++) {
      // convert float32 -1 to 1 to int16 -32768 to 32767
      const int16Value = float32Array[i] * 32768;
      this.buffer[this.bufferWriteIndex++] = int16Value;

      if(this.bufferWriteIndex >= this.buffer.length) {
        this.sendAndClearBuffer();
      }
    }

    if(this.bufferWriteIndex >= this.buffer.length) {
      this.sendAndClearBuffer();
    }
  }
}

registerProcessor('audio-processor-worklet', AudioProcessingWorklet);
`;

export const volumeMeterWorklet = `
class VolumeMeterWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs) {
    if (inputs[0].length) {
      const channel0 = inputs[0][0];
      let sum = 0;
      for (let i = 0; i < channel0.length; i++) {
        sum += channel0[i] * channel0[i];
      }
      const rms = Math.sqrt(sum / channel0.length);
      this.port.postMessage({ volume: rms });
    }
    return true;
  }
}

registerProcessor('volume-meter-worklet', VolumeMeterWorklet);
`;

export function createWorkletFromSource(_name: string, source: string): string {
  const blob = new Blob([source], { type: "application/javascript" });
  return URL.createObjectURL(blob);
}
