export function float32ToPCM16(
    samples:Float32Array
):ArrayBuffer {
    const buffer = new ArrayBuffer(samples.length * 2)

    const view = new DataView(buffer)

    for (let i = 0; i<samples.length; i++){
        const sample = Math.max(
      -1,
      Math.min(1, samples[i])
    );

    const pcmValue =
      sample < 0
        ? sample * 32768
        : sample * 32767;

    view.setInt16(
      i * 2,
      Math.round(pcmValue),
      true
    );
    }

    return buffer;
}