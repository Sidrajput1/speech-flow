class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.bufferSize = Math.round(sampleRate * 0.1);

    this.buffer = new Float32Array(this.bufferSize);

    this.offset = 0;

    this.acceptingAudio = true;

    // Receive control messages from the main thread.
    this.port.onmessage = (event) => {
      if (event.data?.type === "flush") {
        this.acceptingAudio = false;

        this.flush();

        this.port.postMessage({
          type: "flushed",
        });
      }
    };
  }

  flush() {
    if (this.offset === 0) {
      return;
    }

    const remainingSamples = this.buffer.slice(
      0,
      this.offset
    );

    this.port.postMessage(
      remainingSamples,
      [remainingSamples.buffer]
    );

    this.offset = 0;
  }

  process(inputs) {
    if (!this.acceptingAudio) {
      return true;
    }

    const input = inputs[0];

    if (!input || input.length === 0) {
      return true;
    }

    const channel = input[0];

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.offset] = channel[i];

      this.offset++;

      if (this.offset === this.bufferSize) {
        this.port.postMessage(
          this.buffer,
          [this.buffer.buffer]
        );

        this.buffer = new Float32Array(
          this.bufferSize
        );

        this.offset = 0;
      }
    }

    return true;
  }
}

registerProcessor(
  "audio-processor",
  AudioProcessor
);