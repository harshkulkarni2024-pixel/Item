import React, { useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { Icon } from './Icon';

interface VoiceInputProps {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscript, disabled = false }) => {
  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();
  const previousTranscriptRef = useRef<string>('');

  useEffect(() => {
    // Only call onTranscript if the transcript value has actually changed from the recognition service.
    // This prevents overwriting user's typed input with a stale (e.g., empty) transcript value on re-renders.
    if (transcript !== previousTranscriptRef.current) {
      onTranscript(transcript);
    }
    // Update the ref to the current transcript for the next comparison.
    previousTranscriptRef.current = transcript;
  }, [transcript, onTranscript]);


  if (!isSupported) {
    return null;
  }

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      className={`absolute top-1/2 -translate-y-1/2 left-3 flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed ${
        isListening
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
      }`}
      title={isListening ? 'توقف ضبط' : 'شروع ورودی صوتی'}
    >
      <Icon name={isListening ? 'stop' : 'microphone'} className="w-4 h-4" />
      <span>{isListening ? 'توقف' : 'وویس'}</span>
    </button>
  );
};