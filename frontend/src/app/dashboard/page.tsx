'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';

interface Website {
    id: string;
    business?: {
        business_name?: string;
        business_type?: string;
    };
    created_at: string;
    updated_at?: string;
    source_type: string;
}

export default function DashboardPage() {
    const [language, setLanguage] = useState<'en' | 'hi'>('en');
    const [websites, setWebsites] = useState<Website[]>([]);
    const [isLoadingWebsites, setIsLoadingWebsites] = useState(true);
    const router = useRouter();
    const { user, isLoading, isAuthenticated, logout } = useAuth();

    const content = {
        en: {
            title: 'Dashboard',
            welcome: 'Welcome back',
            myWebsites: 'My Websites',
            noWebsites: 'No websites yet',
            createFirst: 'Create your first website',
            createNew: 'Create New Website',
            edit: 'Edit',
            preview: 'Preview',
            credits: 'Credits',
            creditsRemaining: 'Credits remaining',
            creditsInfo: 'Used for creating & editing websites',
            buyCredits: 'Buy More Credits',
            draft: 'Draft',
            live: 'Live',
            logout: 'Logout'
        },
        hi: {
            title: 'Dashboard',
            welcome: 'वापस आइए',
            myWebsites: 'मेरी Websites',
            noWebsites: 'अभी कोई website नहीं',
            createFirst: 'अपनी पहली website बनाएं',
            createNew: 'नई Website बनाएं',
            edit: 'Edit करें',
            preview: 'Preview',
            credits: 'Credits',
            creditsRemaining: 'Credits बचे हैं',
            creditsInfo: 'Website बनाने और edit करने में use होते हैं',
            buyCredits: 'और Credits खरीदें',
            draft: 'Draft',
            live: 'Live',
            logout: 'Logout करें'
        }
    };

    const t = content[language];

    // Redirect if not logged in
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, router]);

    // Fetch user's websites
    useEffect(() => {
        const fetchWebsites = async () => {
            try {
                // TODO: Fetch from API when user-website association is implemented
                setWebsites([]);
            } catch (error) {
                console.error('Failed to fetch websites:', error);
            } finally {
                setIsLoadingWebsites(false);
            }
        };

        if (isAuthenticated) {
            fetchWebsites();
        }
    }, [isAuthenticated]);

    // Get user display name from Supabase user metadata
    const getUserName = () => {
        if (!user) return '';
        const metadata = user.user_metadata;
        return metadata?.full_name || metadata?.name || user.email?.split('@')[0] || '';
    };

    if (isLoading) {
        return (
            <div className="app">
                <Header language={language} setLanguage={setLanguage} />
                <main className="dashboard-page">
                    <div className="dashboard-loading">
                        <div className="spinner large"></div>
                    </div>
                </main>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="app">
            <Header language={language} setLanguage={setLanguage} />
            <main className="dashboard-page">
                <div className="dashboard-container">
                    {/* Welcome Header */}
                    <div className="dashboard-header">
                        <div className="dashboard-welcome">
                            <h1>{t.welcome}, {getUserName()}! 👋</h1>
                        </div>
                        <button onClick={logout} className="btn-text logout-btn">
                            {t.logout}
                        </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="dashboard-cards">
                        {/* Websites Card */}
                        <div className="dashboard-card">
                            <div className="card-icon">🌐</div>
                            <div className="card-content">
                                <h3>{t.myWebsites}</h3>
                                <p className="card-stat">{websites.length}</p>
                            </div>
                        </div>

                        {/* Credits Card */}
                        <div className="dashboard-card">
                            <div className="card-icon">🎯</div>
                            <div className="card-content">
                                <h3>{t.credits}</h3>
                                <p className="card-stat">100</p>
                                <p className="card-subtitle">{t.creditsInfo}</p>
                            </div>
                        </div>
                    </div>

                    {/* Main Action */}
                    <div className="dashboard-cta">
                        <Link href="/create" className="btn-primary btn-large">
                            {t.createNew}
                        </Link>
                    </div>

                    {/* Websites List */}
                    <section className="dashboard-section">
                        <h2>{t.myWebsites}</h2>

                        {isLoadingWebsites ? (
                            <div className="websites-loading">
                                <div className="spinner"></div>
                            </div>
                        ) : websites.length === 0 ? (
                            <div className="websites-empty">
                                <div className="empty-icon">🏗️</div>
                                <p>{t.noWebsites}</p>
                                <Link href="/create" className="btn-secondary">
                                    {t.createFirst}
                                </Link>
                            </div>
                        ) : (
                            <div className="websites-grid">
                                {websites.map((website) => (
                                    <div key={website.id} className="website-card">
                                        <div className="website-card-header">
                                            <h3>{website.business?.business_name || 'Untitled Website'}</h3>
                                            <span className="website-badge draft">{t.draft}</span>
                                        </div>
                                        <p className="website-type">{website.business?.business_type || 'Business'}</p>
                                        <div className="website-card-actions">
                                            <Link href={`/editor/${website.id}`} className="btn-secondary btn-small">
                                                {t.edit}
                                            </Link>
                                            <Link href={`/preview/${website.id}`} className="btn-text btn-small">
                                                {t.preview}
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
