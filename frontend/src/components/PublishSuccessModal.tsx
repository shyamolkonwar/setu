'use client';

import { useEffect } from 'react';
import { Globe, Copy, Check, ExternalLink, X, LayoutDashboard } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PublishSuccessModalProps {
    language: 'en' | 'hi';
    url: string;
    subdomain: string;
    copied: boolean;
    onCopy: () => void;
    onClose: () => void;
}

const content = {
    en: {
        title: 'You are live! 🚀',
        subtitle: 'Your website has been successfully published and is ready to accept customers.',
        publicLink: 'Public Link',
        visitSite: 'View Live Website',
        share: 'Share',
        dashboard: 'Dashboard',
        copyLink: 'Copy Link',
        copied: 'Copied!'
    },
    hi: {
        title: 'आप Live हैं! 🚀',
        subtitle: 'आपकी website successfully publish हो गई है और customers के लिए ready है।',
        publicLink: 'Public Link',
        visitSite: 'Live Website देखें',
        share: 'Share करें',
        dashboard: 'Dashboard',
        copyLink: 'Link Copy',
        copied: 'Copy हो गया!'
    }
};

export default function PublishSuccessModal({
    language,
    url,
    subdomain,
    copied,
    onCopy,
    onClose
}: PublishSuccessModalProps) {
    const t = content[language];

    // Trigger confetti on mount
    useEffect(() => {
        // First burst
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#22c55e', '#ffffff', '#064e3b']
        });

        // Second burst (delayed)
        setTimeout(() => {
            confetti({
                particleCount: 50,
                spread: 100,
                origin: { y: 0.5, x: 0.3 },
                colors: ['#22c55e', '#86efac']
            });
            confetti({
                particleCount: 50,
                spread: 100,
                origin: { y: 0.5, x: 0.7 },
                colors: ['#22c55e', '#86efac']
            });
        }, 300);
    }, []);

    const handleWhatsAppShare = () => {
        const text = encodeURIComponent(`Check out my new website! ${url}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    return (
        <div className="publish-success-overlay" onClick={onClose}>
            <div className="publish-success-modal" onClick={e => e.stopPropagation()}>
                {/* Close Button */}
                <button className="publish-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                {/* Hero Icon */}
                <div className="publish-success-icon">
                    <svg
                        className="checkmark-icon"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </div>

                {/* Headline */}
                <h2 className="publish-success-title">{t.title}</h2>
                <p className="publish-success-subtitle">{t.subtitle}</p>

                {/* Golden Ticket URL Card */}
                <div className="publish-url-card">
                    <div className="url-card-icon">
                        <Globe size={20} />
                    </div>
                    <div className="url-card-content">
                        <span className="url-card-label">{t.publicLink}</span>
                        <span className="url-card-url">{subdomain}.vocoweb.in</span>
                    </div>
                    <button className="url-card-copy" onClick={onCopy}>
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                    </button>
                </div>

                {/* Actions */}
                <div className="publish-success-actions">
                    {/* Primary: Visit Site */}
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="publish-action-primary"
                    >
                        <span>{t.visitSite}</span>
                        <ExternalLink size={16} />
                    </a>

                    {/* Secondary Row */}
                    <div className="publish-action-row">
                        <button
                            className="publish-action-whatsapp"
                            onClick={handleWhatsAppShare}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                            <span>{t.share}</span>
                        </button>
                        <button
                            className="publish-action-dashboard"
                            onClick={onClose}
                        >
                            <LayoutDashboard size={18} />
                            <span>{t.dashboard}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
