import Foundation
import AVFoundation

class CustomMediaRecorder {

    private var recordingSession: AVAudioSession!
    private var audioRecorder: AVAudioRecorder!
    private var audioFilePath: URL!
    private var originalRecordingSessionCategory: AVAudioSession.Category!
    private var status = CurrentRecordingStatus.NONE

    private let settings = [
        AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
        AVSampleRateKey: 44100,
        AVNumberOfChannelsKey: 1,
        AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
    ]

    private func getDirectoryToSaveAudioFile() -> URL {
        return URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true)
    }

    private var onSilenceCallback: (() -> Void)?
    private var silenceThreshold: Float = 2.0

    private var audioEngine: AVAudioEngine?
    private var silenceTimer: Timer?
    private var lastNonSilentTime: Date?

    public func startRecording(onSilenceCallback: @escaping () -> Void, silenceThreshold: Float) -> Bool {
        self.onSilenceCallback = onSilenceCallback
        self.silenceThreshold = silenceThreshold

        do {
            recordingSession = AVAudioSession.sharedInstance()
            originalRecordingSessionCategory = recordingSession.category
            try recordingSession.setCategory(AVAudioSession.Category.playAndRecord)
            try recordingSession.setActive(true)
            audioFilePath = getDirectoryToSaveAudioFile().appendingPathComponent("\(UUID().uuidString).aac")
            audioRecorder = try AVAudioRecorder(url: audioFilePath, settings: settings)
            audioRecorder.record()

            setupSilenceDetector()

            status = CurrentRecordingStatus.RECORDING
            return true
        } catch {
            return false
        }
    }

    private func setupSilenceDetector() {
        audioEngine = AVAudioEngine()
        guard let audioEngine = audioEngine else { return }

        let inputNode = audioEngine.inputNode
        let bus = 0
        let inputFormat = inputNode.inputFormat(forBus: bus)

        inputNode.installTap(onBus: bus, bufferSize: 1024, format: inputFormat) { [weak self] (buffer, time) in
            guard let self = self else { return }
            let level = self.calculateDecibels(buffer: buffer)

            if level > self.silenceThreshold {
                self.lastNonSilentTime = Date()
            } else if let lastNonSilentTime = self.lastNonSilentTime,
                      Date().timeIntervalSince(lastNonSilentTime) >= TimeInterval(self.silenceThreshold) {
                DispatchQueue.main.async {
                    self.onSilenceCallback?()
                }
                self.lastNonSilentTime = nil
            }
        }

        do {
            try audioEngine.start()
        } catch {
            print("Error starting audio engine: \(error)")
        }
    }

    private func calculateDecibels(buffer: AVAudioPCMBuffer) -> Float {
        guard let channelData = buffer.floatChannelData else { return 0 }
        let channelDataValue = channelData.pointee
        let channelDataValueArray = stride(from: 0,
                                           to: Int(buffer.frameLength),
                                           by: buffer.stride).map{ channelDataValue[$0] }
        let rms = sqrt(channelDataValueArray.map{ $0 * $0 }.reduce(0, +) / Float(buffer.frameLength))
        let avgPower = 20 * log10(rms)
        return avgPower
    }

    public func stopRecording() {
        audioEngine?.stop()
        audioEngine?.inputNode.removeTap(onBus: 0)
        audioEngine = nil

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
