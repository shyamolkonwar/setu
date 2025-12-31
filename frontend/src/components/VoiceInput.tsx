'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Pause, Square, Play } from 'lucide-react';

interface VoiceInputProps {
    language: 'en' | 'hi';
    onTranscription: (text: string) => void;
    disabled?: boolean;
    autoGenerate?: boolean; // New prop: auto-trigger generation after transcription
}

const content = {
    en: {
        tapToRecord: "Tap to start recording",
        recording: "Recording...",
        paused: "Paused",
        pause: "Pause",
        resume: "Resume",
        finish: "Finish",
        processing: "Converting speech...",
        permissionDenied: "Microphone access denied. Please enable it in your browser settings.",
        notSupported: "Voice recording is not supported in this browser.",
        recordingError: "Recording failed. Please try again.",
        speakNow: "Speak now..."
    },
    hi: {
        tapToRecord: "Recording शुरू करें",
        recording: "Recording...",
        paused: "रुका हुआ",
        pause: "रोकें",
        resume: "फिर से शुरू करें",
        finish: "समाप्त करें",
        processing: "Speech convert हो रहा है...",
        permissionDenied: "Microphone access denied है। Browser settings में enable करें।",
        notSupported: "इस browser में voice recording support नहीं है।",
        recordingError: "Recording fail हुई। फिर से try करें।",
        speakNow: "अब बोलें..."
    }
};

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing';

export default function VoiceInput({ language, onTranscription, disabled = false, autoGenerate = false }: VoiceInputProps) {
    const [state, setState] = useState<RecordingState>('idle');
    const [error, setError] = useState<string>('');
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioBlobRef = useRef<Blob | null>(null);

    const t = content[language];

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

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

                // Auto-submit when recording finishes
                submitRecording();
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

    const pauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setState('paused');
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setState('recording');
            // Resume timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        }
    };

    const finishRecording = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
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
                // Reset state
                setRecordingTime(0);
                audioBlobRef.current = null;
                setState('idle');
            } else {
                setError(data.error || 'Transcription failed');
                setState('idle');
            }
        } catch {
            setError('Failed to process recording');
            setState('idle');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="voice-input-enhanced">
            {error && <p className="voice-error">{error}</p>}

            {state === 'idle' && (
                <div className="voice-idle-state">
                    <button
                        onClick={startRecording}
                        disabled={disabled}
                        className="mic-button-large"
                        aria-label={t.tapToRecord}
                    >
                        <Mic size={32} strokeWidth={2} color="white" />
                    </button>
                    <p className="voice-hint">{t.tapToRecord}</p>
                </div>
            )}

            {(state === 'recording' || state === 'paused') && (
                <div className="voice-recording-active">
                    <div className="recording-visual">
                        <div className={`recording-pulse ${state === 'recording' ? 'active' : 'paused'}`}>
                            <div className="pulse-ring pulse-ring-1"></div>
                            <div className="pulse-ring pulse-ring-2"></div>
                            <div className="pulse-ring pulse-ring-3"></div>
                            <div className="recording-dot"></div>
                        </div>
                        <p className="recording-status">{state === 'recording' ? t.recording : t.paused}</p>
                        <p className="recording-timer">{formatTime(recordingTime)}</p>
                    </div>

                    <div className="recording-controls">
                        {state === 'recording' ? (
                            <button onClick={pauseRecording} className="control-btn pause-btn">
                                <Pause size={20} strokeWidth={2} />
                                <span>{t.pause}</span>
                            </button>
                        ) : (
                            <button onClick={resumeRecording} className="control-btn resume-btn">
                                <Play size={20} strokeWidth={2} />
                                <span>{t.resume}</span>
                            </button>
                        )}
                        <button onClick={finishRecording} className="control-btn finish-btn">
                            <Square size={20} strokeWidth={2} />
                            <span>{t.finish}</span>
                        </button>
                    </div>
                </div>
            )}

            {state === 'processing' && (
                <div className="voice-processing">
                    <div className="spinner large"></div>
                    <p>{t.processing}</p>
                </div>
            )}
        </div>
    );
}
