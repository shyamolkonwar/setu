'use client';

import { useState, useRef, useEffect } from 'react';

interface VoiceInputProps {
    language: 'en' | 'hi';
    onTranscription: (text: string) => void;
    disabled?: boolean;
}

const content = {
    en: {
        tapToRecord: "Tap to record",
        recording: "Recording...",
        stop: "Stop",
        processing: "Converting speech...",
        useThis: "Use this",
        recordAgain: "Record again",
        permissionDenied: "Microphone access denied. Please enable it in your browser settings.",
        notSupported: "Voice recording is not supported in this browser.",
        recordingError: "Recording failed. Please try again.",
        speakNow: "Speak now...",
        playback: "Listen",
        pause: "Pause"
    },
    hi: {
        tapToRecord: "Record करने के लिए tap करें",
        recording: "Recording...",
        stop: "रोकें",
        processing: "Speech convert हो रहा है...",
        useThis: "इसे use करें",
        recordAgain: "फिर से record करें",
        permissionDenied: "Microphone access denied है। Browser settings में enable करें।",
        notSupported: "इस browser में voice recording support नहीं है।",
        recordingError: "Recording fail हुई। फिर से try करें।",
        speakNow: "अब बोलें...",
        playback: "सुनें",
        pause: "रुकें"
    }
};

type RecordingState = 'idle' | 'recording' | 'review' | 'processing';

export default function VoiceInput({ language, onTranscription, disabled = false }: VoiceInputProps) {
    const [state, setState] = useState<RecordingState>('idle');
    const [error, setError] = useState<string>('');
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioBlobRef = useRef<Blob | null>(null);

    const t = content[language];

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, [audioUrl]);

    const startRecording = async () => {
        setError('');

        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError(t.notSupported);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Determine best supported mime type
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/ogg;codecs=opus'
            ];

            let mimeType = '';
            for (const type of mimeTypes) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    break;
                }
            }

            const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());

                // Create blob from chunks
                const audioBlob = new Blob(audioChunksRef.current, {
                    type: mimeType || 'audio/webm'
                });
                audioBlobRef.current = audioBlob;

                // Create URL for playback
                const url = URL.createObjectURL(audioBlob);
                setAudioUrl(url);
                setState('review');
            };

            mediaRecorder.onerror = () => {
                setError(t.recordingError);
                setState('idle');
            };

            // Start recording
            mediaRecorder.start(100); // Collect data every 100ms
            setState('recording');
            setRecordingTime(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            if (err instanceof Error && err.name === 'NotAllowedError') {
                setError(t.permissionDenied);
            } else {
                setError(t.recordingError);
            }
        }
    };

    const stopRecording = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    const playAudio = () => {
        if (!audioUrl) return;

        if (!audioRef.current) {
            audioRef.current = new Audio(audioUrl);
            audioRef.current.onended = () => setIsPlaying(false);
        }

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const resetRecording = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setAudioUrl(null);
        setIsPlaying(false);
        setRecordingTime(0);
        audioBlobRef.current = null;
        setState('idle');
    };

    const submitRecording = async () => {
        if (!audioBlobRef.current) return;

        setState('processing');
        setError('');

        try {
            const formData = new FormData();
            formData.append('audio', audioBlobRef.current, 'recording.webm');
            formData.append('language', language);

            const response = await fetch('/api/voice', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.normalized_text) {
                onTranscription(data.normalized_text);
                resetRecording();
            } else {
                setError(data.error || 'Transcription failed');
                setState('review');
            }
        } catch {
            setError('Failed to process recording');
            setState('review');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="voice-input-container">
            {error && <p className="voice-error">{error}</p>}

            {state === 'idle' && (
                <button
                    onClick={startRecording}
                    disabled={disabled}
                    className="record-button"
                    aria-label={t.tapToRecord}
                >
                    <svg className="mic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        <line x1="12" y1="19" x2="12" y2="23" />
                        <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    <span className="record-label">{t.tapToRecord}</span>
                </button>
            )}

            {state === 'recording' && (
                <div className="recording-active">
                    <div className="recording-indicator">
                        <span className="pulse-ring"></span>
                        <span className="pulse-ring delay-1"></span>
                        <span className="pulse-ring delay-2"></span>
                        <div className="recording-dot"></div>
                    </div>
                    <p className="speak-now">{t.speakNow}</p>
                    <p className="recording-time">{formatTime(recordingTime)}</p>
                    <button onClick={stopRecording} className="stop-button">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                        {t.stop}
                    </button>
                </div>
            )}

            {state === 'review' && (
                <div className="review-container">
                    <div className="playback-controls">
                        <button onClick={playAudio} className="playback-button">
                            {isPlaying ? (
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="6" y="4" width="4" height="16" rx="1" />
                                    <rect x="14" y="4" width="4" height="16" rx="1" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <polygon points="5,3 19,12 5,21" />
                                </svg>
                            )}
                            {isPlaying ? t.pause : t.playback}
                        </button>
                        <span className="duration">{formatTime(recordingTime)}</span>
                    </div>
                    <div className="review-actions">
                        <button onClick={resetRecording} className="btn-secondary">
                            {t.recordAgain}
                        </button>
                        <button onClick={submitRecording} className="btn-primary">
                            {t.useThis}
                        </button>
                    </div>
                </div>
            )}

            {state === 'processing' && (
                <div className="processing-container">
                    <span className="spinner"></span>
                    <p>{t.processing}</p>
                </div>
            )}
        </div>
    );
}
