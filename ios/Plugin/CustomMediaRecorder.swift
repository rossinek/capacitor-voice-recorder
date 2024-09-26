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
    private var silenceThreshold: Float = 0.01

    private var audioEngine: AVAudioEngine!
    private var silenceTimer: Timer?
    private var lastNonSilenceTime: TimeInterval = 0
    private var audioDetected = false

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

            setupSilenceDetection()

            status = CurrentRecordingStatus.RECORDING
            return true
        } catch {
            return false
        }
    }

    private func setupSilenceDetection() {
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
                self.silenceTimer?.invalidate()
            } else if self.audioDetected {
                print(">>>>>>>> Silence detected")
                let currentTime = CACurrentMediaTime()
                if currentTime - self.lastNonSilenceTime > 2.0 { // 2 seconds of silence
                    print(">>>>>>>> Silence detected 2")
                    self.silenceTimer?.invalidate()
                    self.silenceTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: false) { _ in
                        print(">>>>>>>> Silence detected 3")
                        self.onSilenceCallback?()
                        self.audioDetected = false
                    }
                }
            }
        }

        do {
            try audioEngine.start()
        } catch {
            print("Error starting audio engine: \(error)")
        }
    }

    public func stopRecording() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        silenceTimer?.invalidate()

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
