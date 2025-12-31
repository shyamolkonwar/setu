'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Smartphone, Monitor, Tablet, RefreshCw, Rocket, Mic, Send } from 'lucide-react';
import AuthModal from '@/components/auth/AuthModal';
import PublishSuccessModal from '@/components/PublishSuccessModal';
import { useAuth } from '@/context/AuthContext';

const content = {
    en: {
        loading: "Loading preview...",
        mobile: "Mobile",
        tablet: "Tablet",
        desktop: "Desktop",
        regenerate: "Regenerate",
        publish: "Publish",
        published: "Published",
        republish: "Republish",
        publishing: "Publishing...",
        back: "Edit Details",
        draft: "Draft",
        live: "Live",
        publishSuccess: "🎉 Your website is live!",
        visitSite: "Visit Website",
        copyLink: "Copy Link",
        copied: "Copied!",
        close: "Close",
        aiPlaceholder: "Ask AI to change colors, text, or images...",
        safePreview: "Safe Preview"
    },
    hi: {
        loading: "Preview load हो रहा है...",
        mobile: "Mobile",
        tablet: "Tablet",
        desktop: "Desktop",
        regenerate: "फिर से",
        publish: "Publish",
        published: "Published",
        republish: "Republish",
        publishing: "Publish हो रहा...",
        back: "वापas",
        draft: "Draft",
        live: "Live",
        publishSuccess: "🎉 आपकी website live है!",
        visitSite: "Website देखें",
        copyLink: "Link Copy",
        copied: "Copy हो गया!",
        close: "बंद करें",
        aiPlaceholder: "Colors, text, या images बदलने के लिए AI से पूछें...",
        safePreview: "Safe Preview"
    }
};

interface WebsiteData {
    id: string;
    html: string;
    pages?: { [filename: string]: string };
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

function prepareHtmlForPreview(html: string): string {
    if (!html) return '';

    const interceptorScript = `
    <script>
    (function() {
        console.log('[Preview Mode] Interceptor active');
        
        function showToast(message) {
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#334155;color:white;padding:8px 16px;border-radius:20px;font-family:sans-serif;font-size:12px;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;box-shadow:0 4px 6px rgba(0,0,0,0.1);';
            toast.textContent = message;
            document.body.appendChild(toast);
            requestAnimationFrame(() => toast.style.opacity = '1');
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        }

        window.open = function(url) {
            console.log('[Preview Mode] window.open blocked:', url);
            showToast('External links are blocked in preview');
            return null;
        };

        document.addEventListener('click', function(e) {
            const target = e.target.closest('a, button');
            if (!target) return;
            
            if (target.tagName === 'A') {
                const href = target.getAttribute('href');
                if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
                if (href.startsWith('tel:') || href.startsWith('mailto:')) return;
                
                e.preventDefault();
                e.stopPropagation();
                console.log('[Preview Mode] Link blocked:', href);
                showToast('Navigation blocked in preview mode');
            }
        }, true);
        
        document.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Preview Mode] Form submission blocked');
            showToast('Forms are disabled in preview');
        }, true);
    })();
    </script>
    `;

    const baseTag = '<base target="_self" />';
    let processedHtml = html;

    if (/<head>/i.test(processedHtml)) {
        processedHtml = processedHtml.replace(/<head>/i, `<head>\n${baseTag}`);
    } else if (/<html.*?>/i.test(processedHtml)) {
        processedHtml = processedHtml.replace(/(<html.*?>)/i, `$1\n<head>${baseTag}</head>`);
    } else {
        processedHtml = `${baseTag}\n${processedHtml}`;
    }

    if (/<\/body>/i.test(processedHtml)) {
        processedHtml = processedHtml.replace(/<\/body>/i, `${interceptorScript}\n</body>`);
    } else {
        processedHtml = `${processedHtml}\n${interceptorScript}`;
    }

    return processedHtml;
}

type DeviceMode = 'mobile' | 'tablet' | 'desktop';

export default function PreviewStudioPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const containerRef = useRef<HTMLDivElement>(null);

    const [language] = useState<'en' | 'hi'>('en');
    const [viewMode, setViewMode] = useState<DeviceMode>('desktop');
    const [websiteData, setWebsiteData] = useState<WebsiteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [publishData, setPublishData] = useState<PublishData | null>(null);
    const [showPublishModal, setShowPublishModal] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState('index.html');
    const [aiPrompt, setAiPrompt] = useState('');

    const { isAuthenticated, getAccessToken } = useAuth();
    const t = content[language];

    useEffect(() => {
        fetchPreview();
        checkPublishStatus();
    }, [id]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'NAVIGATE_PREVIEW') {
                const targetPath = event.data.payload;
                const cleanPath = targetPath.endsWith('.html')
                    ? targetPath
                    : `${targetPath.replace(/^\//, '')}.html`;

                if (websiteData?.pages && websiteData.pages[cleanPath]) {
                    setCurrentPage(cleanPath);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [websiteData]);

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
            // Not published yet
        }
    };

    const handleRegenerate = async () => {
        setRegenerating(true);
        try {
            const response = await fetch(`/api/regenerate/${id}`, { method: 'POST' });
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
                headers: { 'Authorization': `Bearer ${token}` }
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

    const handleAiSubmit = () => {
        if (aiPrompt.trim()) {
            // TODO: Implement AI edit functionality
            console.log('AI Edit:', aiPrompt);
            setAiPrompt('');
        }
    };

    const siteName = websiteData?.business?.business_name || 'Your Website';
    const siteSlug = siteName.toLowerCase().replace(/\s+/g, '-');

    // Device dimensions
    const deviceDimensions = {
        mobile: { width: 390, height: 844 },
        tablet: { width: 768, height: 1024 },
        desktop: { width: 1280, height: 800 }
    };

    const currentDevice = deviceDimensions[viewMode];

    if (loading) {
        return (
            <div className="preview-studio">
                <div className="preview-loading">
                    <div className="spinner large"></div>
                    <p>{t.loading}</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="preview-studio">
                <div className="preview-error">
                    <p>{error}</p>
                    <button onClick={() => router.push('/dashboard')} className="btn-primary">
                        {t.back}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="preview-studio">
            {/* Top Command Bar */}
            <header className="preview-topbar">
                <div className="topbar-left">
                    <button onClick={() => router.push('/dashboard')} className="topbar-back-btn">
                        <ArrowLeft size={18} />
                        <span>{t.back}</span>
                    </button>
                    <div className="topbar-url-badge">
                        {publishData?.subdomain || siteSlug}.vocoweb.in
                    </div>
                </div>

                {/* Device Toggle */}
                <div className="device-toggle">
                    <button
                        className={`device-toggle-btn ${viewMode === 'desktop' ? 'active' : ''}`}
                        onClick={() => setViewMode('desktop')}
                    >
                        <Monitor size={16} />
                        <span>{t.desktop}</span>
                    </button>
                    <button
                        className={`device-toggle-btn ${viewMode === 'tablet' ? 'active' : ''}`}
                        onClick={() => setViewMode('tablet')}
                    >
                        <Tablet size={16} />
                        <span>{t.tablet}</span>
                    </button>
                    <button
                        className={`device-toggle-btn ${viewMode === 'mobile' ? 'active' : ''}`}
                        onClick={() => setViewMode('mobile')}
                    >
                        <Smartphone size={16} />
                        <span>{t.mobile}</span>
                    </button>
                </div>

                {/* Actions */}
                <div className="topbar-actions">
                    <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="topbar-action-btn ghost"
                    >
                        <RefreshCw size={16} className={regenerating ? 'spinning' : ''} />
                        <span>{t.regenerate}</span>
                    </button>
                    <button
                        onClick={handlePublish}
                        disabled={publishing}
                        className="topbar-action-btn primary"
                    >
                        <Rocket size={16} />
                        <span>{publishing ? t.publishing : (publishData ? t.published : t.publish)}</span>
                    </button>
                </div>
            </header>

            {/* Preview Stage */}
            <main className="preview-stage" ref={containerRef}>
                <div
                    className={`device-frame ${viewMode}`}
                    style={{
                        width: currentDevice.width,
                        height: currentDevice.height
                    }}
                >
                    {/* Browser Chrome */}
                    <div className="browser-chrome">
                        <div className="traffic-lights">
                            <span className="traffic-light red"></span>
                            <span className="traffic-light yellow"></span>
                            <span className="traffic-light green"></span>
                        </div>
                        <div className="address-bar">
                            {t.safePreview}
                        </div>
                    </div>

                    {/* Website Preview */}
                    <iframe
                        srcDoc={prepareHtmlForPreview(
                            websiteData?.pages
                                ? (websiteData.pages[currentPage] || websiteData.pages['index.html'] || '')
                                : (websiteData?.html || '')
                        )}
                        className="preview-iframe"
                        title="Website Preview"
                        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                </div>
            </main>

            {/* Floating AI Command Bar */}
            <div className="ai-command-bar">
                <div className="ai-command-inner">
                    <button className="ai-mic-btn">
                        <Mic size={20} />
                    </button>
                    <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder={t.aiPlaceholder}
                        className="ai-input"
                        onKeyDown={(e) => e.key === 'Enter' && handleAiSubmit()}
                    />
                    <button
                        className="ai-send-btn"
                        onClick={handleAiSubmit}
                        disabled={!aiPrompt.trim()}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>

            {/* Publish Success Modal */}
            {showPublishModal && publishData && (
                <PublishSuccessModal
                    language={language}
                    url={publishData.url}
                    subdomain={publishData.subdomain}
                    copied={copied}
                    onCopy={copyLink}
                    onClose={() => setShowPublishModal(false)}
                />
            )}

            {/* Auth Modal */}
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
