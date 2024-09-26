import { WebPlugin } from '@capacitor/core';
import { VoiceRecordingService } from './VoiceRecordingService';
export class VoiceRecorderWeb extends WebPlugin {
    constructor() {
        super(...arguments);
        this.voiceRecorderInstance = new VoiceRecordingService();
    }
    canDeviceVoiceRecord() {
        return Promise.resolve({ value: true });
    }
    hasAudioRecordingPermission() {
        return Promise.resolve({ value: true });
    }
    requestAudioRecordingPermission() {
        return Promise.resolve({ value: true });
    }
    startRecording(options) {
        return this.voiceRecorderInstance.startRecording(options);
    }
    stopRecording() {
        return this.voiceRecorderInstance.stopRecording();
    }
    pauseRecording() {
        return this.voiceRecorderInstance.pauseRecording();
    }
    resumeRecording() {
        return this.voiceRecorderInstance.resumeRecording();
    }
    getCurrentStatus() {
        return this.voiceRecorderInstance.getCurrentStatus();
    }
}
//# sourceMappingURL=web.js.map