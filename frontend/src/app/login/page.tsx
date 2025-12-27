'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';

export default function LoginPage() {
    const [language, setLanguage] = useState<'en' | 'hi'>('en');
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();

    const content = {
        en: {
            title: "Welcome to Setu",
            subtitle: "Sign in to manage your websites and publish them live",
            benefits: [
                "Create unlimited website drafts",
                "Publish to your custom domain",
                "Edit anytime using voice or text"
            ]
        },
        hi: {
            title: "Setu में आपका स्वागत है",
            subtitle: "अपनी websites manage और publish करने के लिए sign in करें",
            benefits: [
                "Unlimited website drafts बनाएं",
                "Custom domain पर publish करें",
                "Voice या text से कभी भी edit करें"
            ]
        }
    };

    const t = content[language];

    // Redirect if already logged in
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="app">
                <Header language={language} setLanguage={setLanguage} />
                <main className="auth-page">
                    <div className="auth-loading">
                        <div className="spinner large"></div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="app">
            <Header language={language} setLanguage={setLanguage} />
            <main className="auth-page">
                <div className="auth-container">
                    <div className="auth-form">
                        <div className="auth-header">
                            <h2>{t.title}</h2>
                            <p>{t.subtitle}</p>
                        </div>

                        <div className="auth-benefits">
                            <ul>
                                {t.benefits.map((benefit, i) => (
                                    <li key={i}>
                                        <span className="benefit-check">✓</span>
                                        {benefit}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <GoogleLoginButton language={language} />
                    </div>
                </div>
            </main>
            <Footer language={language} />
        </div>
    );
}
