from math import gcd

import numpy as np
from scipy.signal import resample_poly


class AudioProcessor:

    TARGET_SAMPLE_RATE = 16000

    @staticmethod
    def pcm16_to_float32(
        audio_bytes: bytes
    ) -> np.ndarray:

        if len(audio_bytes) % 2 != 0:
            raise ValueError(
                "Invalid PCM16 audio byte length"
            )
        #interpret raw bythes into numpy array
        samples = np.frombuffer(
            audio_bytes,
            dtype="<i2"
        )

        return (
            #for normalize floating point
            samples.astype(np.float32) / 32768.0
        )


    @staticmethod
    def resample(
        audio: np.ndarray,
        source_rate: int,
        target_rate: int = 16000
    ) -> np.ndarray:

        if source_rate <= 0 or target_rate <= 0:
            raise ValueError(
                "Sample rates must be positive"
            )

        if audio.size == 0:
            return audio.astype(np.float32)

        if source_rate == target_rate:
            return audio.astype(np.float32)

        divisor = gcd(
            source_rate,
            target_rate
        )

        up = target_rate // divisor

        down = source_rate // divisor

        result = resample_poly(
            audio,
            up,
            down
        )

        return result.astype(np.float32)


    @classmethod
    def prepare_audio(
        cls,
        audio_bytes: bytes,
        source_rate: int
    ) -> np.ndarray:

        audio = cls.pcm16_to_float32(
            audio_bytes
        )

        audio = cls.resample(
            audio,
            source_rate,
            cls.TARGET_SAMPLE_RATE
        )

        return audio