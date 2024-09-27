var capacitorVoiceRecorder = (function (exports, core, getBlobDuration) {
    'use strict';

    const RecordingStatus = {
        RECORDING: 'RECORDING',
        PAUSED: 'PAUSED',
        NONE: 'NONE',
    };

    const VoiceRecorder = core.registerPlugin('VoiceRecorder', {
        web: () => Promise.resolve().then(function () { return web; }).then((m) => new m.VoiceRecorderWeb()),
    });

    class VoiceRecordingService {
        constructor() {
            this.audioChunks = [];
        }
        async startRecording(options) {
            console.log('>>>>> startRecording shark');
            this.reset();
            // eslint-disable-next-line no-async-promise-executor
            return new Promise(async (resolve) => {
                var _a, _b;
                this.audioChunks = [];
                this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.mediaRecorder = new MediaRecorder(this.stream);
                await this.setupSilenceDetector((_a = options.onSilenceCallback) !== null && _a !== void 0 ? _a : (() => console.log('onSilenceCallback not set')), (_b = options.silenceThreshold) !== null && _b !== void 0 ? _b : 2.0);
                this.mediaRecorder.ondataavailable = (event) => {
                    this.audioChunks.push(event.data);
                };
                this.mediaRecorder.onstart = () => {
                    resolve({ value: true });
                };
                this.mediaRecorder.start(1000);
            });
        }
        stopRecording() {
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
                        this.reset();
                    }, 500);
                };
                this.stopMediaRecorder();
            });
        }
        reset() {
            this.audioChunks = [];
            this.stopMediaRecorder();
            this.cleanupSilenceDetector();
        }
        static blobToBase64(blob) {
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
        stopMediaRecorder() {
            var _a;
            (_a = this.mediaRecorder) === null || _a === void 0 ? void 0 : _a.stop();
            if (this.mediaRecorder) {
                this.mediaRecorder.stream.getTracks().forEach(track => {
                    track.stop();
                });
            }
            this.mediaRecorder = undefined;
        }
        async setupSilenceDetector(onSilenceCallback, silenceThreshold) {
            this.audioContext = new AudioContext();
            await this.audioContext.audioWorklet.addModule('/audio-worklets/silence-detector-processor.js');
            if (!this.stream) {
                throw new Error("Stream is not initialized");
            }
            const sourceNode = this.audioContext.createMediaStreamSource(this.stream);
            this.silenceDetectorNode = new AudioWorkletNode(this.audioContext, "silence-detector-processor", {
                processorOptions: {
                    silenceSecondsThreshold: silenceThreshold
                }
            });
            this.silenceDetectorNode.port.onmessage = event => {
                var _a;
                if (event.data.stopRecording) {
                    if (((_a = this.mediaRecorder) === null || _a === void 0 ? void 0 : _a.state) === "recording") {
                        onSilenceCallback();
                    }
                }
            };
            sourceNode
                .connect(this.silenceDetectorNode)
                .connect(this.audioContext.destination);
        }
        cleanupSilenceDetector() {
            if (this.audioContext && this.audioContext.state !== "closed") {
                this.audioContext.close();
            }
            this.silenceDetectorNode = undefined;
            this.audioContext = undefined;
        }
        static async requestAudioRecordingPermission() {
            return { value: true };
        }
        pauseRecording() {
            throw new Error("Not implemented");
        }
        resumeRecording() {
            throw new Error("Not implemented");
        }
        getCurrentStatus() {
            throw new Error("Not implemented");
        }
        static getSupportedMimeType() {
            throw new Error("Not implemented");
        }
    }

    class VoiceRecorderWeb extends core.WebPlugin {
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

    var web = /*#__PURE__*/Object.freeze({
        __proto__: null,
        VoiceRecorderWeb: VoiceRecorderWeb
    });

    exports.RecordingStatus = RecordingStatus;
    exports.VoiceRecorder = VoiceRecorder;

    return exports;

})({}, capacitorExports, getBlobDuration);
//# sourceMappingURL=plugin.js.map
