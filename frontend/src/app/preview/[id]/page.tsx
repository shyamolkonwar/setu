'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import AuthModal from '@/components/auth/AuthModal';
import { useAuth } from '@/context/AuthContext';

const content = {
    en: {
        loading: "Loading preview...",
        mobile: "Mobile",
        desktop: "Desktop",
        regenerate: "Regenerate",
        publish: "Publish Website",
        publishing: "Publishing...",
        editPrompt: "Edit with text",
        editWebsite: "Edit Website",
        back: "← Back to edit",
        publishSuccess: "🎉 Your website is live!",
        visitSite: "Visit Website",
        copyLink: "Copy Link",
        copied: "Copied!",
        close: "Close"
    },
    hi: {
        loading: "Preview load हो रहा है...",
        mobile: "Mobile",
        desktop: "Desktop",
        regenerate: "फिर से बनाएं",
        publish: "Website Publish करें",
        publishing: "Publish हो रहा है...",
        editPrompt: "Text से edit करें",
        editWebsite: "Website Edit करें",
        back: "← Edit पर वापस",
        publishSuccess: "🎉 आपकी website live है!",
        visitSite: "Website देखें",
        copyLink: "Link Copy करें",
        copied: "Copy हो गया!",
        close: "बंद करें"
    }
};

interface WebsiteData {
    id: string;
    html: string;
    business: {
        business_name: string;
        business_type: string;
        location: string;
    };
}

interface PublishData {
    subdomain: string;
    url: string;
    published_at: string;
}

export default function PreviewPage() {
    const params = useParams();
    const id = params.id as string;

    const [language, setLanguage] = useState<'en' | 'hi'>('en');
    const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
    const [websiteData, setWebsiteData] = useState<WebsiteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [publishData, setPublishData] = useState<PublishData | null>(null);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    const { isAuthenticated, getAccessToken } = useAuth();

    const t = content[language];

    useEffect(() => {
        fetchPreview();
        checkPublishStatus();
    }, [id]);

    const fetchPreview = async () => {
        try {
            const response = await fetch(`/api/preview/${id}`);
            const data = await response.json();

            if (response.ok) {
                setWebsiteData(data);
            } else {
                setError(data.error || 'Failed to load preview');
            }
        } catch {
            setError('Failed to load preview');
        } finally {
            setLoading(false);
        }
    };

    const checkPublishStatus = async () => {
        try {
            const response = await fetch(`/api/publish/${id}/status`);
            const data = await response.json();
            if (data.published) {
                setPublishData({
                    subdomain: data.subdomain,
                    url: data.url,
                    published_at: data.published_at
                });
            }
        } catch {
            // Not published yet, that's fine
        }
    };

    const handleRegenerate = async () => {
        setRegenerating(true);
        try {
            const response = await fetch(`/api/regenerate/${id}`, {
                method: 'POST'
            });
            const data = await response.json();

            if (response.ok) {
                setWebsiteData(data);
            } else {
                setError(data.error || 'Failed to regenerate');
            }
        } catch {
            setError('Failed to regenerate');
        } finally {
            setRegenerating(false);
        }
    };

    const handlePublish = async () => {
        // Check if user is authenticated
        if (!isAuthenticated) {
            setShowAuthModal(true);
            return;
        }

        setPublishing(true);
        setError('');

        try {
            const token = getAccessToken();
            const endpoint = publishData ? `/api/republish/${id}` : `/api/publish/${id}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (response.ok) {
                setPublishData({
                    subdomain: data.subdomain,
                    url: data.url,
                    published_at: data.published_at
                });
                setShowPublishModal(true);
            } else if (response.status === 401) {
                // Token expired or invalid, show auth modal
                setShowAuthModal(true);
            } else {
                setError(data.detail || 'Failed to publish');
            }
        } catch {
            setError('Failed to publish');
        } finally {
            setPublishing(false);
        }
    };

    const copyLink = () => {
        if (publishData?.url) {
            navigator.clipboard.writeText(publishData.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="app preview-app">
            {/* Header - only visible on mobile */}
            <div className="preview-header-mobile">
                <Header language={language} setLanguage={setLanguage} />
            </div>

            <main className="preview-page">
                {loading ? (
                    <div className="preview-loading">
                        <div className="spinner large"></div>
                        <p>{t.loading}</p>
                    </div>
                ) : error ? (
                    <div className="preview-error">
                        <p>{error}</p>
                        <a href="/create" className="btn-secondary">{t.back}</a>
                    </div>
                ) : (
                    <>
                        {/* Preview Controls */}
                        <div className="preview-controls">
                            <a href="/create" className="back-link">{t.back}</a>

                            <div className="preview-controls-center">
                                {/* Language Toggle - Desktop only */}
                                <div className="language-toggle-desktop">
                                    <button
                                        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                                        onClick={() => setLanguage('en')}
                                    >
                                        EN
                                    </button>
                                    <button
                                        className={`lang-btn ${language === 'hi' ? 'active' : ''}`}
                                        onClick={() => setLanguage('hi')}
                                    >
                                        हिं
                                    </button>
                                </div>

                                {/* View Toggle */}
                                <div className="view-toggle">
                                    <button
                                        className={`view-btn ${viewMode === 'mobile' ? 'active' : ''}`}
                                        onClick={() => setViewMode('mobile')}
                                    >
                                        📱 {t.mobile}
                                    </button>
                                    <button
                                        className={`view-btn ${viewMode === 'desktop' ? 'active' : ''}`}
                                        onClick={() => setViewMode('desktop')}
                                    >
                                        💻 {t.desktop}
                                    </button>
                                </div>
                            </div>

                            <div className="preview-actions">
                                <a
                                    href={`/editor/${id}`}
                                    className="btn-secondary"
                                >
                                    ✏️ {t.editWebsite}
                                </a>
                                <button
                                    onClick={handleRegenerate}
                                    disabled={regenerating || publishing}
                                    className="btn-secondary"
                                >
                                    {regenerating ? '...' : t.regenerate}
                                </button>
                                <button
                                    onClick={handlePublish}
                                    disabled={publishing || regenerating}
                                    className="btn-primary"
                                >
                                    {publishing ? (
                                        <>
                                            <span className="spinner"></span>
                                            {t.publishing}
                                        </>
                                    ) : (
                                        t.publish
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Published Status Badge */}
                        {publishData && !showPublishModal && (
                            <div className="published-badge">
                                <span className="live-dot"></span>
                                Live at: <a href={publishData.url} target="_blank" rel="noopener noreferrer">{publishData.url}</a>
                            </div>
                        )}

                        {/* Preview Frame */}
                        <div className={`preview-frame-container ${viewMode}`}>
                            <div className="preview-frame">
                                <div className="frame-header">
                                    <div className="frame-dots">
                                        <span></span><span></span><span></span>
                                    </div>
                                    <div className="frame-url">
                                        {publishData?.subdomain || websiteData?.business?.business_name?.toLowerCase().replace(/\s+/g, '-') || 'your-site'}.setu.in
                                    </div>
                                </div>
                                <iframe
                                    srcDoc={websiteData?.html || ''}
                                    className="preview-iframe"
                                    title="Website Preview"
                                />
                            </div>
                        </div>

                        {/* Publish Success Modal */}
                        {showPublishModal && publishData && (
                            <div className="modal-overlay" onClick={() => setShowPublishModal(false)}>
                                <div className="modal-content publish-modal" onClick={e => e.stopPropagation()}>
                                    <button className="modal-close" onClick={() => setShowPublishModal(false)}>
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M18 6L6 18M6 6l12 12" />
                                        </svg>
                                    </button>

                                    <div className="publish-success">
                                        <div className="success-icon">🎉</div>
                                        <h2>{t.publishSuccess}</h2>

                                        <div className="publish-url-box">
                                            <span className="live-indicator">
                                                <span className="live-dot"></span>
                                                LIVE
                                            </span>
                                            <code>{publishData.url}</code>
                                        </div>

                                        <div className="publish-actions">
                                            <a
                                                href={publishData.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-primary"
                                            >
                                                {t.visitSite}
                                            </a>
                                            <button onClick={copyLink} className="btn-secondary">
                                                {copied ? t.copied : t.copyLink}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Auth Modal for Publish */}
                        {showAuthModal && (
                            <AuthModal
                                language={language}
                                onClose={() => setShowAuthModal(false)}
                                title={language === 'en' ? 'Login to Publish' : 'Publish करने के लिए Login करें'}
                                subtitle={language === 'en'
                                    ? 'Sign in to publish your website and make it live'
                                    : 'अपनी website publish और live करने के लिए sign in करें'
                                }
                            />
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

