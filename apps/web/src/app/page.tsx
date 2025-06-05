import React from 'react';
import { Button } from '@replyguy/ui';
import { ActivityIcon, BarChart3Icon, SettingsIcon, BotIcon } from 'lucide-react';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3">
                            <BotIcon className="h-8 w-8 text-blue-600" />
                            <h1 className="text-2xl font-bold text-gray-900">ReplyGuy</h1>
                        </div>
                        <nav className="flex space-x-4">
                            <Button variant="ghost" size="sm">
                                Dashboard
                            </Button>
                            <Button variant="ghost" size="sm">
                                Analytics
                            </Button>
                            <Button variant="ghost" size="sm">
                                Settings
                            </Button>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
                        AI-Powered{' '}
                        <span className="text-blue-600">Farcaster Replies</span>
                    </h1>
                    <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
                        ReplyGuy intelligently responds to Farcaster casts using advanced AI,
                        verified data sources, and zero-knowledge proofs for authentic interactions.
                    </p>
                    <div className="mt-10 flex justify-center space-x-4">
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                            Get Started
                        </Button>
                        <Button variant="outline" size="lg">
                            View Analytics
                        </Button>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                            <ActivityIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Real-time Processing
                        </h3>
                        <p className="text-gray-600">
                            Monitor Farcaster webhooks and process new casts in real-time with intelligent filtering.
                        </p>
                    </div>

                    <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                        <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
                            <BarChart3Icon className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            Analytics Dashboard
                        </h3>
                        <p className="text-gray-600">
                            Track reply performance, engagement metrics, and AI confidence scores across all interactions.
                        </p>
                    </div>

                    <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                        <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
                            <SettingsIcon className="h-6 w-6 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            zkTLS Verification
                        </h3>
                        <p className="text-gray-600">
                            Verify data authenticity using Reclaim Protocol&apos;s zero-knowledge proofs for trusted responses.
                        </p>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="bg-white rounded-lg p-8 shadow-md border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                        System Status
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600">--</div>
                            <div className="text-sm text-gray-600">Casts Processed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600">--</div>
                            <div className="text-sm text-gray-600">Replies Sent</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600">--</div>
                            <div className="text-sm text-gray-600">Proofs Verified</div>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl font-bold text-orange-600">--</div>
                            <div className="text-sm text-gray-600">Active Users</div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="text-center text-gray-600">
                        <p>&copy; 2024 ReplyGuy. Powered by AI, verified by zkTLS.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
} 