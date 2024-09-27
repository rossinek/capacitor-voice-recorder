import Foundation
import AVFoundation

class CustomMediaRecorder {

    private var recordingSession: AVAudioSession!
    private var audioRecorder: AVAudioRecorder!
    private var audioFilePath: URL!
    private var originalRecordingSessionCategory: AVAudioSession.Category!
    private var status = CurrentRecordingStatus.NONE

    private let settings = [
        AVFormatIDKey: Int(kAudioFormatLinearPCM),
        AVSampleRateKey: 44100,
        AVNumberOfChannelsKey: 1,
        AVLinearPCMBitDepthKey: 16,
        AVLinearPCMIsFloatKey: false,
        AVLinearPCMIsBigEndianKey: false,
        AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
    ]

    private func getDirectoryToSaveAudioFile() -> URL {
        return URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true)
    }

    private var onSilenceCallback: (() -> Void)?
    private var silenceThreshold: Float = 0.01
    private var silenceThresholdSeconds: Float = 2.0

    private var audioEngine: AVAudioEngine!
    private var lastNonSilenceTime: TimeInterval = 0
    private var audioDetected = false

    init() {
        setupAudioSession()
        setupAudioEngine()
    }

    private func setupAudioSession() {
        do {
            recordingSession = AVAudioSession.sharedInstance()
            originalRecordingSessionCategory = recordingSession.category
            try recordingSession.setCategory(AVAudioSession.Category.playAndRecord)
            try recordingSession.setActive(true)
        } catch {
            print("Error setting up audio session: \(error)")
        }
    }

    private func setupAudioEngine() {
        audioEngine = AVAudioEngine()
        let inputNode = audioEngine.inputNode
        let bus = 0

        inputNode.installTap(onBus: bus, bufferSize: 1024, format: inputNode.outputFormat(forBus: bus)) { [weak self] (buffer, time) in
            guard let self = self else { return }

            let channelData = buffer.floatChannelData?[0]
            let frameCount = buffer.frameLength

            var sum: Float = 0
            for i in 0..<Int(frameCount) {
                sum += abs(channelData![i])
            }

            let average = sum / Float(frameCount)

            print("Average: \(average)")
            print("Silence threshold: \(self.silenceThreshold)")

            if average >= self.silenceThreshold {
                self.audioDetected = true
                self.lastNonSilenceTime = CACurrentMediaTime()
            } else if self.audioDetected {
                print(">>>>>>>> Silence detected")
                let currentTime = CACurrentMediaTime()
                if currentTime - self.lastNonSilenceTime > Double(self.silenceThresholdSeconds) {
                    print(">>>>>>>> Silence detected 2")
                    self.onSilenceCallback?()
                    self.audioDetected = false
                }
            }
        }
    }

    public func startRecording(onSilenceCallback: @escaping () -> Void, silenceThresholdSeconds: Float) -> Bool {
        self.onSilenceCallback = onSilenceCallback
        self.silenceThresholdSeconds = silenceThresholdSeconds

        do {
            audioFilePath = getDirectoryToSaveAudioFile().appendingPathComponent("\(UUID().uuidString).wav")
            audioRecorder = try AVAudioRecorder(url: audioFilePath, settings: settings)
            audioRecorder.record()

            try audioEngine.start()

            status = CurrentRecordingStatus.RECORDING
            return true
        } catch {
            print("Error starting recording: \(error)")
            return false
        }
    }

    public func stopRecording() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)

        do {
            audioRecorder.stop()
            try recordingSession.setActive(false)
            try recordingSession.setCategory(originalRecordingSessionCategory)
            originalRecordingSessionCategory = nil
            audioRecorder = nil
            recordingSession = nil
            status = CurrentRecordingStatus.NONE
        } catch {}
    }

    public func getOutputFile() -> URL {
        return audioFilePath
    }

    public func pauseRecording() -> Bool {
        if(status == CurrentRecordingStatus.RECORDING) {
            audioRecorder.pause()
            status = CurrentRecordingStatus.PAUSED
            return true
        } else {
            return false
        }
    }

    public func resumeRecording() -> Bool {
        if(status == CurrentRecordingStatus.PAUSED) {
            audioRecorder.record()
            status = CurrentRecordingStatus.RECORDING
            return true
        } else {
            return false
        }
    }

    public func getCurrentStatus() -> CurrentRecordingStatus {
        return status
    }

}
