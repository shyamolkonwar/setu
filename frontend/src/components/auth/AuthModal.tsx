'use client';

import { useState, useEffect } from 'react';
import { X, Mail } from 'lucide-react';
import GoogleLoginButton from './GoogleLoginButton';

interface AuthModalProps {
    language: 'en' | 'hi';
    onClose: () => void;
    title?: string;
    subtitle?: string;
    mode?: 'save' | 'default';
}

const content = {
    en: {
        saveTitle: 'Save your progress',
        saveSubtitle: 'Log in to save, publish, and edit your websites.',
        defaultTitle: 'Unlock your dashboard',
        defaultSubtitle: 'Log in to save, publish, and edit your websites.',
        continueWithGoogle: 'Continue with Google',
        continueWithEmail: 'Continue with Email',
        or: 'Or',
        emailPlaceholder: 'name@email.com',
        continue: 'Continue',
        noAccount: 'No account?',
        signUp: 'Sign up'
    },
    hi: {
        saveTitle: 'अपनी Progress Save करें',
        saveSubtitle: 'Websites save, publish और edit करने के लिए login करें।',
        defaultTitle: 'Dashboard unlock करें',
        defaultSubtitle: 'Websites save, publish और edit करने के लिए login करें।',
        continueWithGoogle: 'Google से जारी रखें',
        continueWithEmail: 'Email से जारी रखें',
        or: 'या',
        emailPlaceholder: 'name@email.com',
        continue: 'Continue',
        noAccount: 'Account नहीं है?',
        signUp: 'Sign up करें'
    }
};

export default function AuthModal({ language, onClose, title, subtitle, mode = 'default' }: AuthModalProps) {
    const t = content[language];
    const [isOpen, setIsOpen] = useState(false);

    // Animate in on mount
    useEffect(() => {
        // Small delay to trigger animation
        const timer = setTimeout(() => setIsOpen(true), 10);
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        return () => {
            clearTimeout(timer);
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        setTimeout(onClose, 150); // Wait for animation to complete
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const displayTitle = title || (mode === 'save' ? t.saveTitle : t.defaultTitle);
    const displaySubtitle = subtitle || (mode === 'save' ? t.saveSubtitle : t.defaultSubtitle);

    return (
        <div
            className={`auth-modal-overlay ${isOpen ? 'open' : ''}`}
            onClick={handleBackdropClick}
        >
            <div className={`auth-modal-card ${isOpen ? 'open' : ''}`}>
                {/* Close Button */}
                <button
                    className="auth-modal-close"
                    onClick={handleClose}
                    aria-label="Close"
                >
                    <X size={24} strokeWidth={2} />
                </button>

                {/* Header */}
                <div className="auth-modal-header">
                    <h2 className="auth-modal-title">{displayTitle}</h2>
                    <p className="auth-modal-subtitle">{displaySubtitle}</p>
                </div>

                {/* Actions */}
                <div className="auth-modal-actions">
                    {/* Google Login - Primary */}
                    <GoogleLoginButton language={language} />
                </div>
            </div>
        </div>
    );
}
