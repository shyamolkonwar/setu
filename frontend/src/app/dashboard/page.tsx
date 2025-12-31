import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { Eye, MessageCircle, Globe, Plus, BarChart2, Settings, Share2, ExternalLink } from 'lucide-react';

import { getWebsites, getCredits } from "@/lib/api";

export const metadata = {
    title: 'Dashboard | Vocoweb',
};

// Stats Card Component
function StatsCard({
    icon: Icon,
    label,
    value,
    color
}: {
    icon: any;
    label: string;
    value: string | number;
    color: 'blue' | 'green' | 'purple';
}) {
    const colors = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
        green: { bg: 'bg-green-50', text: 'text-green-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600' }
    };

    return (
        <div className="stats-card">
            <div className={`stats-icon ${colors[color].bg} ${colors[color].text}`}>
                <Icon size={24} />
            </div>
            <div className="stats-content">
                <span className="stats-label">{label}</span>
                <span className="stats-value">{value}</span>
            </div>
        </div>
    );
}

// Site Card Component
function SiteCard({ website }: { website: any }) {
    const businessName = website.business_json?.business_name || 'Untitled Website';
    const businessType = website.business_json?.business_type || 'Business';
    const isLive = website.status === 'live';
    const subdomain = website.subdomain || businessName.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="site-card">
            {/* Thumbnail Area */}
            <div className="site-card-thumbnail">
                {/* Status Badge */}
                <div className={`site-status-badge ${isLive ? 'live' : 'draft'}`}>
                    <span className="status-dot"></span>
                    {isLive ? 'Live' : 'Draft'}
                </div>

                {/* Placeholder for screenshot/preview */}
                <div className="site-preview-placeholder">
                    <Globe size={40} className="text-slate-300" />
                </div>

                {/* Hover Overlay */}
                <Link href={`/preview/${website.id}`} className="site-card-overlay">
                    <span className="overlay-btn">Edit Site</span>
                </Link>
            </div>

            {/* Info Area */}
            <div className="site-card-info">
                <h3 className="site-card-title">{businessName}</h3>
                {isLive && website.subdomain && (
                    <a
                        href={`https://${website.subdomain}.vocoweb.in`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="site-card-link"
                    >
                        {website.subdomain}.vocoweb.in <ExternalLink size={12} />
                    </a>
                )}
                {!isLive && (
                    <span className="site-card-type">{businessType}</span>
                )}

                {/* Action Row */}
                <div className="site-card-actions">
                    <button className="site-action-btn">
                        <BarChart2 size={16} />
                        <span>Stats</span>
                    </button>
                    <button className="site-action-btn">
                        <Settings size={16} />
                        <span>Settings</span>
                    </button>
                    <button className="site-action-btn icon-only">
                        <Share2 size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Empty State Component
function EmptyState() {
    return (
        <div className="dashboard-empty">
            <div className="empty-illustration">🚀</div>
            <h3 className="empty-title">You haven't built a website yet</h3>
            <p className="empty-text">Create your first business website in just 30 seconds using voice or text.</p>
            <Link href="/create" className="empty-cta">
                <Plus size={20} />
                Build Your First Site
            </Link>
        </div>
    );
}

// Stats Section (Server Component)
async function StatsSection() {
    const [websites, credits] = await Promise.all([
        getWebsites(),
        getCredits()
    ]);

    const liveCount = websites.filter((w: any) => w.status === 'live').length;

    return (
        <div className="stats-grid">
            <StatsCard
                icon={Eye}
                label="Total Views"
                value="—"
                color="blue"
            />
            <StatsCard
                icon={MessageCircle}
                label="WhatsApp Leads"
                value="—"
                color="green"
            />
            <StatsCard
                icon={Globe}
                label="Active Sites"
                value={liveCount}
                color="purple"
            />
        </div>
    );
}

// Websites Grid (Server Component)
async function WebsitesGrid() {
    const websites = await getWebsites();

    if (websites.length === 0) {
        return <EmptyState />;
    }

    return (
        <div className="sites-grid">
            {websites.map((website: any) => (
                <SiteCard key={website.id} website={website} />
            ))}
        </div>
    );
}

// Loading Skeleton
function StatsSkeleton() {
    return (
        <div className="stats-grid">
            {[1, 2, 3].map(i => (
                <div key={i} className="stats-card skeleton">
                    <div className="skeleton-icon"></div>
                    <div className="skeleton-content">
                        <div className="skeleton-label"></div>
                        <div className="skeleton-value"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function WebsitesSkeleton() {
    return (
        <div className="sites-grid">
            {[1, 2, 3].map(i => (
                <div key={i} className="site-card skeleton">
                    <div className="skeleton-thumbnail"></div>
                    <div className="skeleton-info">
                        <div className="skeleton-title"></div>
                        <div className="skeleton-link"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect('/login');
    }

    const userName = session.user?.user_metadata?.full_name?.split(' ')[0] || 'there';

    return (
        <div className="dashboard-container">
            {/* Welcome Header */}
            <div className="dashboard-header">
                <div className="dashboard-welcome">
                    <h1 className="dashboard-title">Overview</h1>
                    <p className="dashboard-subtitle">Manage your websites and view performance.</p>
                </div>
                <Link href="/create" className="dashboard-create-btn desktop-only">
                    <Plus size={20} />
                    <span>New Website</span>
                </Link>
            </div>

            {/* Stats Bar */}
            <Suspense fallback={<StatsSkeleton />}>
                <StatsSection />
            </Suspense>

            {/* Websites Section */}
            <div className="dashboard-section">
                <h2 className="section-title">My Websites</h2>
                <Suspense fallback={<WebsitesSkeleton />}>
                    <WebsitesGrid />
                </Suspense>
            </div>

            {/* Mobile FAB */}
            <Link href="/create" className="dashboard-fab mobile-only">
                <Plus size={28} />
            </Link>
        </div>
    );
}
