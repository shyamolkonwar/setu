'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ProgressHeader from '@/components/ProgressHeader';
import FocusCard from '@/components/FocusCard';
import ThinkingSteps from '@/components/ThinkingSteps';
import VoiceInput from '@/components/VoiceInput';
import AuthModal from '@/components/auth/AuthModal';
import { useAuth } from '@/context/AuthContext';

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
        subtitle: "Include your business name, location, and what you sell. You can speak in Hindi or English.",
        placeholder: "Example: I run a dental clinic in Dibrugarh. We specialize in teeth cleaning, root canal treatment, and braces. Our clinic is open from 9 AM to 8 PM.",
        examplesTitle: "Need inspiration? Try these:",
        generate: "Generate My Website",
        generating: "Creating your website...",
        charCount: "characters",
        minChars: "Minimum 20 characters",
        typeManually: "Or type it manually",
        voiceSubtitle: "Speak in English or Hindi",
        loginRequired: "Please log in to generate your website",
        insufficientCredits: "You need more credits to generate a website"
    },
    hi: {
        title: "अपने business के बारे में बताएं",
        subtitle: "Business का नाम, location, और आप क्या बेचते हैं बताएं। Hindi या English में बोल सकते हैं।",
        placeholder: "जैसे: मैं Dibrugarh में dental clinic चलाता हूं। हम teeth cleaning, root canal, और braces में specialize करते हैं। Clinic सुबह 9 से रात 8 बजे तक खुला है।",
        examplesTitle: "Ideas चाहिए? ये try करें:",
        generate: "मेरी Website बनाएं",
        generating: "Website बना रहे हैं...",
        charCount: "characters",
        minChars: "कम से कम 20 characters",
        typeManually: "या manually type करें",
        voiceSubtitle: "Hindi या English में बोलें",
        loginRequired: "Website बनाने के लिए login करें",
        insufficientCredits: "आपको और credits चाहिए"
    }
};

type InputMode = 'voice' | 'text';

export default function CreatePage() {
    const [language, setLanguage] = useState<'en' | 'hi'>('en');
    const [inputMode, setInputMode] = useState<InputMode>('voice');
    const [businessDesc, setBusinessDesc] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');
    const [showAuthModal, setShowAuthModal] = useState(false);
    const router = useRouter();
    const { isAuthenticated } = useAuth();
    const t = content[language];

    const handleGenerate = async () => {
        if (businessDesc.trim().length < 20) {
            setError(t.minChars);
            return;
        }

        if (!isAuthenticated) {
            setShowAuthModal(true);
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
            } else if (data.requiresAuth) {
                setShowAuthModal(true);
                setIsGenerating(false);
            } else if (data.insufficientCredits) {
                setError(t.insufficientCredits);
                setIsGenerating(false);
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
        setInputMode('text');
        setError('');
    };

    const useExample = (example: string) => {
        setBusinessDesc(example);
        setInputMode('text');
        setError('');
    };

    return (
        <div className="app-shell">
            <Header language={language} setLanguage={setLanguage} isAppMode={true} />

            <main className="app-main">
                <ProgressHeader currentStep="identity" />
                <FocusCard>
                    {isGenerating ? (
                        <ThinkingSteps inputMode={inputMode} />
                    ) : (
                        <>
                            <div className="studio-header">
                                <h1 className="studio-title">{t.title}</h1>
                                <p className="studio-subtitle">{t.subtitle}</p>
                            </div>

                            {inputMode === 'voice' ? (
                                <div className="voice-mode-container">
                                    <VoiceInput
                                        language={language}
                                        onTranscription={(text) => {
                                            setBusinessDesc(text);
                                            // Check auth before proceeding
                                            if (!isAuthenticated) {
                                                setShowAuthModal(true);
                                                return;
                                            }
                                            // Auto-generate after transcription if authenticated
                                            if (text.trim().length >= 20) {
                                                handleGenerate();
                                            }
                                        }}
                                        disabled={isGenerating}
                                        autoGenerate={true}
                                    />
                                    <button
                                        className="type-manually-link"
                                        onClick={() => setInputMode('text')}
                                    >
                                        {t.typeManually}
                                    </button>
                                </div>
                            ) : (
                                <div className="text-mode-container">
                                    <div className="input-wrapper">
                                        <textarea
                                            value={businessDesc}
                                            onChange={(e) => {
                                                setBusinessDesc(e.target.value);
                                                setError('');
                                            }}
                                            placeholder={t.placeholder}
                                            className="business-input-studio"
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
                                        {t.generate}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </FocusCard>

                {inputMode === 'text' && !isGenerating && (
                    <div className="examples-section-studio">
                        <h3 className="examples-title">{t.examplesTitle}</h3>
                        <div className="examples-grid">
                            {examples[language].map((example, index) => (
                                <button
                                    key={index}
                                    onClick={() => useExample(example)}
                                    className="example-card"
                                >
                                    "{example}"
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {showAuthModal && (
                <AuthModal
                    language={language}
                    onClose={() => setShowAuthModal(false)}
                    mode="save"
                />
            )}
        </div>
    );
}
