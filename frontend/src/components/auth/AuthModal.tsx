'use client';

import GoogleLoginButton from './GoogleLoginButton';

interface AuthModalProps {
    language: 'en' | 'hi';
    onClose: () => void;
    title?: string;
    subtitle?: string;
}

const content = {
    en: {
        defaultTitle: 'Login to continue',
        defaultSubtitle: 'Sign in to publish and manage your websites',
        close: 'Cancel'
    },
    hi: {
        defaultTitle: 'जारी रखने के लिए Login करें',
        defaultSubtitle: 'अपनी websites publish और manage करने के लिए sign in करें',
        close: 'Cancel करें'
    }
};

export default function AuthModal({ language, onClose, title, subtitle }: AuthModalProps) {
    const t = content[language];

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="modal-backdrop" onClick={handleBackdropClick}>
            <div className="modal-content auth-modal">
                <button className="modal-close" onClick={onClose}>
                    ×
                </button>

                <div className="auth-modal-header">
                    <h2>{title || t.defaultTitle}</h2>
                    <p>{subtitle || t.defaultSubtitle}</p>
                </div>

                <div className="auth-modal-body">
                    <GoogleLoginButton language={language} />
                </div>

                <div className="auth-modal-footer">
                    <button onClick={onClose} className="btn-text">
                        {t.close}
                    </button>
                </div>
            </div>
        </div>
    );
}
