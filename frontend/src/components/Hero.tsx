'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';

interface HeroProps {
  language: 'en' | 'hi';
}

const content = {
  en: {
    headline: 'Your Business Online. Just Speak.',
    subheading: "Describe your business in Hindi or English, and our AI builds and launches your website in 30 seconds. No drag-and-drop. No headaches.",
    cta: 'Build My Site for Free',
    secondary: 'Watch Demo',
    badge: 'Built for Local Businesses'
  },
  hi: {
    headline: 'आपका Business Online। बस बोलें।',
    subheading: "Professional दिखने वाले competitors से customers मत खोइए। अपने business को Hindi या English में बताइए, और हमारी AI 30 seconds में unique website बना देगी। No drag-and-drop. कोई headache नहीं।",
    cta: 'Free में Site बनाएं',
    secondary: 'Demo Video देखें',
    badge: 'Local Businesses के लिए बना'
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
          {t.subheading}
        </p>

        {/* CTA Buttons */}
        <div className="hero-cta-container">
          <Link href="/create" className="btn-primary">
            {t.cta}
          </Link>
          <button
            onClick={() => {
              const mockupSection = document.querySelector('.mockup-wrapper');
              if (mockupSection) {
                mockupSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="btn-secondary"
          >
            <Play size={18} strokeWidth={2} />
            {t.secondary}
          </button>
        </div>

        {/* Website Mockup */}
        <div className="mockup-wrapper">
          {/* Voice Input Bubble - Hidden on mobile */}
          <div className="mockup-voice-bubble">
            <div className="voice-icon">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
            </div>
            <span className="voice-label">Voice</span>
            <p className="voice-text">&quot;I run a bakery in Delhi&quot;</p>
          </div>

          {/* Generated Badge - Hidden on mobile */}
          <div className="mockup-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Generated in 30s
          </div>

          {/* Main Website Preview */}
          <div className="mockup-browser">
            {/* Browser Chrome */}
            <div className="browser-chrome">
              <div className="browser-dots">
                <span className="dot red"></span>
                <span className="dot yellow"></span>
                <span className="dot green"></span>
              </div>
              <div className="browser-url">
                🔒 sweetbakery.vocoweb.in
              </div>
            </div>

            {/* Website Content */}
            <div className="website-content">
              {/* Website Header */}
              <div className="website-header">
                <div className="website-logo">
                  <span className="logo-emoji">🧁</span>
                  <span className="logo-name">Sweet Bakery</span>
                </div>
                <nav className="website-nav">
                  <span>Menu</span>
                  <span>About</span>
                  <span>Contact</span>
                </nav>
                <button className="website-cta-btn">Order Now</button>
              </div>

              {/* Hero Banner */}
              <div className="website-hero">
                <div className="website-hero-content">
                  <h2 className="website-hero-title">Fresh Baked<br />Every Day</h2>
                  <p className="website-hero-desc">
                    Delicious cakes, pastries & artisan bread made with love in Connaught Place, Delhi
                  </p>
                  <div className="website-hero-btns">
                    <button className="hero-btn-primary">View Menu</button>
                    <button className="hero-btn-secondary">Call Us</button>
                  </div>
                </div>
                <div className="website-hero-emoji">🎂</div>
              </div>

              {/* Menu Items */}
              <div className="website-menu">
                <h3 className="menu-title">Our Bestsellers</h3>
                <div className="menu-grid">
                  <div className="menu-item">
                    <span className="item-emoji">🎂</span>
                    <span className="item-name">Birthday Cake</span>
                    <span className="item-price">₹499</span>
                  </div>
                  <div className="menu-item">
                    <span className="item-emoji">🥐</span>
                    <span className="item-name">Croissant</span>
                    <span className="item-price">₹79</span>
                  </div>
                  <div className="menu-item">
                    <span className="item-emoji">🍞</span>
                    <span className="item-name">Sourdough</span>
                    <span className="item-price">₹149</span>
                  </div>
                  <div className="menu-item">
                    <span className="item-emoji">🧁</span>
                    <span className="item-name">Cupcakes</span>
                    <span className="item-price">₹59</span>
                  </div>
                </div>
              </div>

              {/* Footer Bar */}
              <div className="website-footer">
                <div className="footer-info">
                  <span>📍 Connaught Place, Delhi</span>
                  <span className="footer-divider">|</span>
                  <span>⏰ 9 AM - 9 PM</span>
                </div>
                <div className="footer-phone">
                  📞 +91 98765 43210
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
