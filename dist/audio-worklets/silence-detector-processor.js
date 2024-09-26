// silence-detector-processor.js
class SilenceDetectorProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{ name: "threshold", defaultValue: 0.01, minValue: 0, maxValue: 1 }]
  }

  silenceSecondsThreshold

  constructor(options) {
    super()
    this.silenceStart = 0
    this.audioDetected = false // New flag to track if non-silence audio has been detected
    this.silenceSecondsThreshold =
      options.processorOptions.silenceSecondsThreshold
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0]
    const threshold = parameters.threshold[0]
    if (input.length > 0) {
      const channelData = input[0]
      let sum = 0
      for (let i = 0; i < channelData.length; i++) {
        sum += Math.abs(channelData[i])
      }
      let average = sum / channelData.length
      if (average >= threshold) {
        this.audioDetected = true // Audio above the threshold detected
        this.silenceStart = 0 // Reset silence start time
      } else if (this.audioDetected) {
        // If audio has been detected and now it's silence
        if (this.silenceStart === 0) {
          this.silenceStart = currentTime
        } else if (
          currentTime - this.silenceStart >
          this.silenceSecondsThreshold
        ) {
          // N second of silence after audio was detected (N = this.silenceSecondsThreshold)
          this.port.postMessage({ stopRecording: true })
          this.audioDetected = false // Optionally reset, depending on whether you want to detect multiple phrases
        }
      }
    }
    return true
  }
}

registerProcessor("silence-detector-processor", SilenceDetectorProcessor)
