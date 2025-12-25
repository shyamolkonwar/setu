'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import VoiceInput from '@/components/VoiceInput';

const examples = {
    en: [
        "I run a dental clinic in Dibrugarh. We offer teeth cleaning, root canal, and braces.",
        "My bakery in Patna sells cakes, pastries, and fresh bread. We do home delivery.",
        "I teach math and science tuition for classes 8-12 in Indore.",
        "We run a hardware store in Guwahati selling paints, tools, and plumbing supplies."
    ],
    hi: [
        "मैं Dibrugarh में dental clinic चलाता हूं। हम teeth cleaning, root canal, और braces करते हैं।",
        "मेरी Patna में bakery है जहाँ cakes, pastries, और fresh bread मिलती है। Home delivery भी करते हैं।",
        "मैं Indore में class 8-12 के लिए math और science tuition पढ़ाता हूं।",
        "हमारी Guwahati में hardware shop है जहाँ paints, tools, और plumbing supplies मिलते हैं।"
    ]
};

const content = {
    en: {
        title: "Tell us about your business",
        subtitle: "Describe your business using text or voice. We'll create a professional website for you.",
        placeholder: "Example: I run a dental clinic in Dibrugarh. We specialize in teeth cleaning, root canal treatment, and braces. Our clinic is open from 9 AM to 8 PM.",
        examplesTitle: "Need inspiration? Try these:",
        generate: "Generate My Website",
        generating: "Creating your website...",
        charCount: "characters",
        minChars: "Minimum 20 characters",
        textMode: "Type",
        voiceMode: "Voice",
        voiceSubtitle: "Speak in English or Hindi",
        orDivider: "or"
    },
    hi: {
        title: "अपने business के बारे में बताएं",
        subtitle: "Text या voice से अपना business describe करें। हम आपके लिए professional website बनाएंगे।",
        placeholder: "जैसे: मैं Dibrugarh में dental clinic चलाता हूं। हम teeth cleaning, root canal, और braces में specialize करते हैं। Clinic सुबह 9 से रात 8 बजे तक खुला है।",
        examplesTitle: "Ideas चाहिए? ये try करें:",
        generate: "मेरी Website बनाएं",
        generating: "Website बना रहे हैं...",
        charCount: "characters",
        minChars: "कम से कम 20 characters",
        textMode: "Type करें",
        voiceMode: "बोलें",
        voiceSubtitle: "Hindi या English में बोलें",
        orDivider: "या"
    }
};

type InputMode = 'text' | 'voice';

export default function CreatePage() {
    const [language, setLanguage] = useState<'en' | 'hi'>('en');
    const [inputMode, setInputMode] = useState<InputMode>('text');
    const [businessDesc, setBusinessDesc] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const t = content[language];

    const handleGenerate = async () => {
        if (businessDesc.trim().length < 20) {
            setError(t.minChars);
            return;
        }

        setError('');
        setIsGenerating(true);

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: businessDesc,
                    language
                })
            });

            const data = await response.json();

            if (response.ok && data.id) {
                router.push(`/preview/${data.id}`);
            } else {
                setError(data.error || 'Something went wrong');
                setIsGenerating(false);
            }
        } catch {
            setError('Failed to generate website');
            setIsGenerating(false);
        }
    };

    const handleVoiceTranscription = (text: string) => {
        setBusinessDesc(text);
        setInputMode('text'); // Switch to text mode to show/edit transcription
        setError('');
    };

    const useExample = (example: string) => {
        setBusinessDesc(example);
        setError('');
    };

    return (
        <div className="app">
            <Header language={language} setLanguage={setLanguage} />

            <main className="create-page">
                <div className="create-container">
                    <div className="create-header">
                        <h1 className="create-title">{t.title}</h1>
                        <p className="create-subtitle">{t.subtitle}</p>
                    </div>

                    {/* Input Mode Toggle */}
                    <div className="input-mode-toggle">
                        <button
                            onClick={() => setInputMode('text')}
                            className={`mode-btn ${inputMode === 'text' ? 'active' : ''}`}
                            disabled={isGenerating}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            {t.textMode}
                        </button>
                        <button
                            onClick={() => setInputMode('voice')}
                            className={`mode-btn ${inputMode === 'voice' ? 'active' : ''}`}
                            disabled={isGenerating}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                <line x1="12" y1="19" x2="12" y2="23" />
                                <line x1="8" y1="23" x2="16" y2="23" />
                            </svg>
                            {t.voiceMode}
                        </button>
                    </div>

                    <div className="create-form">
                        {inputMode === 'voice' ? (
                            <>
                                <VoiceInput
                                    language={language}
                                    onTranscription={handleVoiceTranscription}
                                    disabled={isGenerating}
                                />
                                <p className="voice-hint">{t.voiceSubtitle}</p>
                            </>
                        ) : (
                            <>
                                <div className="input-wrapper">
                                    <textarea
                                        value={businessDesc}
                                        onChange={(e) => {
                                            setBusinessDesc(e.target.value);
                                            setError('');
                                        }}
                                        placeholder={t.placeholder}
                                        className="business-input"
                                        rows={6}
                                        disabled={isGenerating}
                                    />
                                    <div className="input-footer">
                                        <span className={`char-count ${businessDesc.length < 20 ? 'low' : ''}`}>
                                            {businessDesc.length} {t.charCount}
                                        </span>
                                    </div>
                                </div>

                                {error && <p className="form-error">{error}</p>}

                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating || businessDesc.trim().length < 20}
                                    className="btn-primary btn-full btn-large"
                                >
                                    {isGenerating ? (
                                        <>
                                            <span className="spinner"></span>
                                            {t.generating}
                                        </>
                                    ) : (
                                        t.generate
                                    )}
                                </button>
                            </>
                        )}
                    </div>

                    {inputMode === 'text' && (
                        <div className="examples-section">
                            <h3 className="examples-title">{t.examplesTitle}</h3>
                            <div className="examples-grid">
                                {examples[language].map((example, index) => (
                                    <button
                                        key={index}
                                        onClick={() => useExample(example)}
                                        className="example-card"
                                        disabled={isGenerating}
                                    >
                                        "{example}"
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer language={language} />
        </div>
    );
}
