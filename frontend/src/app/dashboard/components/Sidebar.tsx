"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, MessageSquarePlus, CreditCard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

interface SidebarProps {
    onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
    const pathname = usePathname();
    const { user } = useAuth();
    const { t } = useLanguage();

    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";
    const avatarUrl = user?.user_metadata?.avatar_url;

    const navItems = [
        { name: t.myWebsites, href: "/dashboard", icon: LayoutGrid },
        { name: t.leadsCustomers, href: "/dashboard/leads", icon: Users },
        { name: t.popupManager, href: "/dashboard/popup", icon: MessageSquarePlus },
        { name: t.billingCredits, href: "/dashboard/credits", icon: CreditCard },
    ];

    const handleClick = () => {
        if (onNavigate) {
            onNavigate();
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
        }}>
            {/* Logo Area */}
            <div style={{
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
                borderBottom: '1px solid #f1f5f9'
            }}>
                <span style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#0f766e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#0d9488',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 'bold'
                    }}>◈</span>
                    Vocoweb
                </span>
            </div>

            {/* Navigation Links */}
            <nav style={{
                flex: 1,
                padding: '24px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
            }}>
                {navItems.map((item) => {
                    const isActive = item.href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname?.startsWith(item.href);

                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleClick}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px',
                                minHeight: '44px', // Touch-friendly
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: 500,
                                textDecoration: 'none',
                                transition: 'all 0.15s ease',
                                backgroundColor: isActive ? '#f0fdfa' : 'transparent',
                                color: isActive ? '#0f766e' : '#64748b',
                                borderRight: isActive ? '3px solid #0d9488' : 'none'
                            }}
                        >
                            <Icon size={18} color={isActive ? '#0d9488' : '#94a3b8'} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Profile Area */}
            <div style={{
                padding: '16px',
                borderTop: '1px solid #f1f5f9'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={displayName}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b',
                            fontWeight: 'bold',
                            fontSize: '14px'
                        }}>
                            {displayName[0]?.toUpperCase()}
                        </div>
                    )}
                    <div style={{ overflow: 'hidden' }}>
                        <p style={{
                            fontWeight: 500,
                            color: '#334155',
                            fontSize: '14px',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>{displayName}</p>
                        <p style={{
                            fontSize: '12px',
                            color: '#94a3b8',
                            margin: 0
                        }}>{t.freePlan}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
