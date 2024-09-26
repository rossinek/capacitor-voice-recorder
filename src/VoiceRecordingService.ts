import getBlobDuration from 'get-blob-duration';

import type { Base64String, CurrentRecordingStatus, GenericResponse, RecordingData } from './definitions';

export class VoiceRecordingService {
  private stream: MediaStream | undefined;
  private mediaRecorder: MediaRecorder | undefined;
  private audioChunks: Blob[] = [];
  private silenceDetectorNode: AudioWorkletNode | undefined;
  private audioContext: AudioContext | undefined;

  public async startRecording(options: {
    onSilenceCallback: () => void;
    silenceThreshold?: number;
  }): Promise<GenericResponse> {
    console.log('>>>>> startRecording shark');
    this.reset();
    // eslint-disable-next-line no-async-promise-executor
    return new Promise<GenericResponse>(async (resolve) => {
      this.audioChunks = [];
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.mediaRecorder = new MediaRecorder(this.stream);

      await this.setupSilenceDetector(options.onSilenceCallback, options.silenceThreshold ?? 2.0);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        this.audioChunks.push(event.data);
      };
      this.mediaRecorder.onstart = () => {
        resolve({ value: true });
      };
      this.mediaRecorder.start(1000);
    });
  }

  public stopRecording(): Promise<RecordingData> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        throw new Error("MediaRecorder is not initialized");
      }

      this.mediaRecorder.onstop = () => {
        setTimeout(async () => {
          const audioBlob = new Blob(this.audioChunks, {
            type: "audio/wav; codecs=opus"
          });
          const recordDataBase64 = await VoiceRecordingService.blobToBase64(audioBlob);
          const mimeType = "audio/wav; codecs=opus";
          const recordingDuration = await getBlobDuration(audioBlob);
          resolve({ value: { recordDataBase64, mimeType, msDuration: recordingDuration * 1000 } });
        }, 500);
      };
      this.stopMediaRecorder();
    });
  }

  reset(): void {
    this.audioChunks = [];
    this.stopMediaRecorder();
    this.cleanupSilenceDetector();
  }

  private static blobToBase64(blob: Blob): Promise<Base64String> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const recordingResult = String(reader.result);
        const splitResult = recordingResult.split('base64,');
        const toResolve = splitResult.length > 1 ? splitResult[1] : recordingResult;
        resolve(toResolve.trim());
      };
      reader.readAsDataURL(blob);
    });
  }

  private stopMediaRecorder(): void {
    this.mediaRecorder?.stop();
    if (this.mediaRecorder) {
      this.mediaRecorder.stream.getTracks().forEach(track => {
        track.stop();
      });
    }
    this.mediaRecorder = undefined;
  }

  private async setupSilenceDetector(onSilenceCallback: () => void, silenceThreshold: number): Promise<void> {
    this.audioContext = new AudioContext();
    await this.audioContext.audioWorklet.addModule(new URL('./audio-worklets/silence-detector-processor.js', import.meta.url));

    if (!this.stream) {
      throw new Error("Stream is not initialized");
    }

    const sourceNode = this.audioContext.createMediaStreamSource(this.stream);
    this.silenceDetectorNode = new AudioWorkletNode(
      this.audioContext,
      "silence-detector-processor",
      {
        processorOptions: {
          silenceSecondsThreshold: silenceThreshold
        }
      }
    );

    this.silenceDetectorNode.port.onmessage = event => {
      if (event.data.stopRecording) {
        if (this.mediaRecorder?.state === "recording") {
          onSilenceCallback();
        }
      }
    };

    sourceNode
      .connect(this.silenceDetectorNode)
      .connect(this.audioContext.destination);
  }

  private cleanupSilenceDetector(): void {
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
    }
    this.silenceDetectorNode = undefined;
    this.audioContext = undefined;
  }

  public static async requestAudioRecordingPermission(): Promise<GenericResponse> {
    return { value: true };
  }

  public pauseRecording(): Promise<GenericResponse> {
    throw new Error("Not implemented");
  }

  public resumeRecording(): Promise<GenericResponse> {
    throw new Error("Not implemented");
  }

  public getCurrentStatus(): Promise<CurrentRecordingStatus> {
    throw new Error("Not implemented");
  }

  public static getSupportedMimeType(): string | null {
    throw new Error("Not implemented");
  }
}
