'use client';

import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import Sidebar from "./components/Sidebar";
import DashboardHeader from "./components/DashboardHeader";
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <AuthProvider>
            <LanguageProvider>
                {/* Mobile Overlay */}
                {sidebarOpen && (
                    <div
                        onClick={() => setSidebarOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 40,
                        }}
                        className="md:hidden"
                    />
                )}

                <div style={{
                    display: 'flex',
                    minHeight: '100vh',
                    backgroundColor: '#f8fafc'
                }}>
                    {/* Desktop Sidebar - Hidden on mobile */}
                    <aside
                        className="hidden md:flex"
                        style={{
                            width: '256px',
                            flexShrink: 0,
                            borderRight: '1px solid #e2e8f0',
                            backgroundColor: 'white',
                            flexDirection: 'column',
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            zIndex: 50
                        }}
                    >
                        <Sidebar onNavigate={() => { }} />
                    </aside>

                    {/* Mobile Sidebar - Slide-over drawer */}
                    <aside
                        className="md:hidden"
                        style={{
                            width: '80%',
                            maxWidth: '300px',
                            flexShrink: 0,
                            borderRight: '1px solid #e2e8f0',
                            backgroundColor: 'white',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            bottom: 0,
                            zIndex: 50,
                            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                            transition: 'transform 0.3s ease-in-out'
                        }}
                    >
                        {/* Close button */}
                        <button
                            onClick={() => setSidebarOpen(false)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                padding: '8px',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#64748b'
                            }}
                        >
                            <X size={24} />
                        </button>
                        <Sidebar onNavigate={() => setSidebarOpen(false)} />
                    </aside>

                    {/* Main Content Area */}
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: '100vh',
                            marginLeft: 0
                        }}
                        className="md:!ml-[256px]"
                    >
                        {/* Top Header */}
                        <header style={{
                            height: '64px',
                            borderBottom: '1px solid #e2e8f0',
                            backgroundColor: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 16px',
                            justifyContent: 'space-between',
                            gap: '16px'
                        }}>
                            {/* Mobile hamburger menu */}
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="flex md:hidden items-center justify-center"
                                style={{
                                    padding: '8px',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#64748b'
                                }}
                            >
                                <Menu size={24} />
                            </button>

                            {/* Mobile Logo - Only shows on mobile when sidebar is hidden */}
                            <span
                                className="flex md:hidden items-center gap-2"
                                style={{
                                    fontSize: '18px',
                                    fontWeight: 'bold',
                                    color: '#0f766e'
                                }}
                            >
                                <span style={{
                                    width: '28px',
                                    height: '28px',
                                    backgroundColor: '#0d9488',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}>L</span>
                                Vocoweb
                            </span>

                            <DashboardHeader />
                        </header>

                        {/* Scrollable Page Content */}
                        <main style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '16px'
                        }} className="md:p-8">
                            <div style={{ maxWidth: '1024px', margin: '0 auto' }}>
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
            </LanguageProvider>
        </AuthProvider>
    );
}
