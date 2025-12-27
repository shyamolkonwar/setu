'use client';

import Link from 'next/link';

interface HeroProps {
  language: 'en' | 'hi';
}

const content = {
  en: {
    headline: 'Build your business website using voice or text.',
    subheading: "No coding. No design. No hosting headaches.\nJust tell us about your business — we'll do the rest.",
    cta: 'Get Started',
    secondary: 'See how it works',
    badge: 'Built for local businesses',
    haveWebsite: 'Already have a website?',
    redesign: 'Redesign it \u2192'
  },
  hi: {
    headline: 'Voice या text से अपनी business website बनाएं।',
    subheading: "Coding नहीं। Design नहीं। Hosting की tension नहीं।\nबस अपने business के बारे में बताएं — बाकी हम कर देंगे।",
    cta: 'शुरू करें',
    secondary: 'देखें कैसे काम करता है',
    badge: 'Local businesses के लिए बना',
    haveWebsite: 'Website पहले से है?',
    redesign: 'Redesign करें →'
  }
};

export default function Hero({ language }: HeroProps) {
  const t = content[language];

  return (
    <section className="hero-section">
      <div className="hero-container">
        {/* Trust Badge */}
        <div className="hero-badge">
          <span className="badge-dot"></span>
          <span>{t.badge}</span>
        </div>

        {/* Main Headline */}
        <h1 className="hero-headline">
          {t.headline}
        </h1>

        {/* Subheading */}
        <p className="hero-subheading">
          {t.subheading.split('\n').map((line, i) => (
            <span key={i}>
              {line}
              {i === 0 && <br />}
            </span>
          ))}
        </p>

        {/* CTA Buttons */}
        <div className="hero-cta-container">
          <Link href="/create" className="btn-primary">
            {t.cta}
          </Link>
          <button
            onClick={() => {
              const featuresSection = document.getElementById('features-section');
              if (featuresSection) {
                featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="btn-secondary"
          >
            {t.secondary}
          </button>
        </div>

        {/* Redesign Link */}
        <div className="redesign-link-container">
          <span className="redesign-text">{t.haveWebsite}</span>
          <a href="/redesign" className="redesign-link">{t.redesign}</a>
        </div>

        {/* Preview Illustration */}
        <div className="hero-preview">
          <div className="preview-card">
            <div className="preview-header">
              <div className="preview-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="preview-url">yoursite.setu.in</div>
            </div>
            <div className="preview-content">
              <div className="preview-hero-block"></div>
              <div className="preview-text-block"></div>
              <div className="preview-text-block short"></div>
              <div className="preview-grid">
                <div className="preview-box"></div>
                <div className="preview-box"></div>
                <div className="preview-box"></div>
              </div>
            </div>
          </div>

          {/* Floating elements for visual appeal */}
          <div className="floating-element floating-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor" />
            </svg>
          </div>
          <div className="floating-element floating-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor" />
            </svg>
          </div>
          <div className="floating-element floating-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
