import type { CurrentRecordingStatus, GenericResponse, RecordingData } from './definitions';
export declare class VoiceRecordingService {
    private stream;
    private mediaRecorder;
    private audioChunks;
    private silenceDetectorNode;
    private audioContext;
    startRecording(options: {
        onSilenceCallback: () => void;
        silenceThreshold?: number;
    }): Promise<GenericResponse>;
    stopRecording(): Promise<RecordingData>;
    reset(): void;
    private static blobToBase64;
    private stopMediaRecorder;
    private setupSilenceDetector;
    private cleanupSilenceDetector;
    static requestAudioRecordingPermission(): Promise<GenericResponse>;
    pauseRecording(): Promise<GenericResponse>;
    resumeRecording(): Promise<GenericResponse>;
    getCurrentStatus(): Promise<CurrentRecordingStatus>;
    static getSupportedMimeType(): string | null;
}
