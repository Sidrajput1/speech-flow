import numpy as np

from app.services.audio_processor import (
    AudioProcessor
)


def main():

    source_rate = 48000

    duration = 3

    frequency = 440


    # Generate a synthetic audio waveform
    time = np.arange(
        source_rate * duration
    ) / source_rate

    audio = 0.5 * np.sin(
        2 * np.pi * frequency * time
    )


    # Convert Float32-style audio to PCM16
    pcm16 = (
        audio * 32767
    ).astype("<i2")


    # Convert numerical samples to bytes
    audio_bytes = pcm16.tobytes()


    # Convert into Whisper-compatible audio
    processed_audio = AudioProcessor.prepare_audio(
        audio_bytes,
        source_rate
    )


    print("Original sample rate:", source_rate)

    print("Original samples:", len(audio))

    print("Original bytes:", len(audio_bytes))

    print(
        "Processed sample rate:",
        AudioProcessor.TARGET_SAMPLE_RATE
    )

    print(
        "Processed samples:",
        len(processed_audio)
    )

    print(
        "Processed data type:",
        processed_audio.dtype
    )

    print(
        "Processed duration:",
        len(processed_audio) / 16000
    )

    assert len(processed_audio) == 48000

    assert processed_audio.dtype == np.float32

    print("\nAudio processing test passed!")


if __name__ == "__main__":
    main()