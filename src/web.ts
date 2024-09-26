import { WebPlugin } from '@capacitor/core';

import { VoiceRecordingService } from './VoiceRecordingService';
import type { CurrentRecordingStatus, GenericResponse, RecordingData, VoiceRecorderPlugin } from './definitions';

export class VoiceRecorderWeb extends WebPlugin implements VoiceRecorderPlugin {
  private voiceRecorderInstance = new VoiceRecordingService();

  public canDeviceVoiceRecord(): Promise<GenericResponse> {
    return Promise.resolve({ value: true });
  }

  public hasAudioRecordingPermission(): Promise<GenericResponse> {
    return Promise.resolve({ value: true });
  }

  public requestAudioRecordingPermission(): Promise<GenericResponse> {
    return Promise.resolve({ value: true });
  }

  public startRecording(options: {
    onSilenceCallback?: () => void;
    silenceThreshold?: number;
  }): Promise<GenericResponse> {
    return this.voiceRecorderInstance.startRecording(options);
  }

  public stopRecording(): Promise<RecordingData> {
    return this.voiceRecorderInstance.stopRecording();
  }

  public pauseRecording(): Promise<GenericResponse> {
    return this.voiceRecorderInstance.pauseRecording();
  }

  public resumeRecording(): Promise<GenericResponse> {
    return this.voiceRecorderInstance.resumeRecording();
  }

  public getCurrentStatus(): Promise<CurrentRecordingStatus> {
    return this.voiceRecorderInstance.getCurrentStatus();
  }
}
