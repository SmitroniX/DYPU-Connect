'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, getCountFromServer } from 'firebase/firestore';
import { cacheGet, cacheInvalidate } from '@/lib/cache';
import { BarChart3, GraduationCap, RefreshCw, TrendingUp, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface FieldDistribution {
    field: string;
    count: number;
}

interface YearDistribution {
    year: string;
    count: number;
}

interface GenderDistribution {
    gender: string;
    count: number;
}

interface SignupTrend {
    label: string;
    count: number;
}

interface AnalyticsData {
    totalUsers: number;
    totalPublicMessages: number;
    totalConfessions: number;
    totalAnonMessages: number;
    fieldDistribution: FieldDistribution[];
    yearDistribution: YearDistribution[];
    genderDistribution: GenderDistribution[];
    signupTrend: SignupTrend[];
}

/* ── Tiny SVG bar chart ─────────────────────────── */
function BarChart({ data, colorVar = '--ui-accent' }: { data: { label: string; count: number }[]; colorVar?: string }) {
    const max = Math.max(...data.map(d => d.count), 1);
    return (
        <div className="space-y-2">
            {data.map(({ label, count }) => (
                <div key={label} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--ui-text-muted)] w-32 truncate text-right shrink-0">{label}</span>
                    <div className="flex-1 h-6 bg-[var(--ui-bg-elevated)] rounded-md overflow-hidden">
                        <div
                            className="h-full rounded-md transition-all duration-500"
                            style={{ width: `${(count / max) * 100}%`, backgroundColor: `var(${colorVar})` }}
                        />
                    </div>
                    <span className="text-xs font-semibold text-[var(--ui-text-secondary)] w-10 text-right">{count}</span>
                </div>
            ))}
        </div>
    );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
    return (
        <div className="surface p-5">
            <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/20">
                    <Icon className="h-5 w-5 text-[var(--ui-accent)]" />
                </div>
                <TrendingUp className="h-4 w-4 text-[var(--ui-text-muted)]" />
            </div>
            <p className="text-2xl font-bold text-[var(--ui-text)]">{value.toLocaleString()}</p>
            <p className="text-xs text-[var(--ui-text-muted)] mt-1">{label}</p>
        </div>
    );
}

export default function AdminAnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAnalytics = useCallback(async (isRefresh = false) => {
        if (isRefresh) { setRefreshing(true); cacheInvalidate('admin_analytics'); }
        else setLoading(true);

        try {
            const analytics = await cacheGet<AnalyticsData>(
                'admin_analytics',
                async () => {
                    // Fetch all user docs (needed for distribution breakdowns)
                    const usersSnapshot = await getDocs(collection(db, 'users'));
                    const users = usersSnapshot.docs.map(d => d.data());

                    // Counts
                    const [pubCount, confCount, anonCount] = await Promise.all([
                        getCountFromServer(collection(db, 'public_chat')),
                        getCountFromServer(collection(db, 'confessions_public')),
                        getCountFromServer(collection(db, 'anonymous_public_chat_private')),
                    ]);

                    // Field distribution
                    const fieldMap = new Map<string, number>();
                    const yearMap = new Map<string, number>();
                    const genderMap = new Map<string, number>();
                    const signupMap = new Map<string, number>();

                    const now = Date.now();
                    const monthLabels: string[] = [];
                    for (let i = 5; i >= 0; i--) {
                        const d = new Date(now);
                        d.setMonth(d.getMonth() - i);
                        monthLabels.push(`${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`);
                    }
                    monthLabels.forEach(l => signupMap.set(l, 0));

                    users.forEach(u => {
                        const field = (u.field as string) || 'Unknown';
                        fieldMap.set(field, (fieldMap.get(field) || 0) + 1);

                        const year = (u.year as string) || 'Unknown';
                        yearMap.set(year, (yearMap.get(year) || 0) + 1);

                        const gender = (u.gender as string) || 'other';
                        const gLabel = gender.charAt(0).toUpperCase() + gender.slice(1);
                        genderMap.set(gLabel, (genderMap.get(gLabel) || 0) + 1);

                        const createdAt = u.createdAt as number | undefined;
                        if (createdAt) {
                            const d = new Date(createdAt);
                            const label = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
                            if (signupMap.has(label)) {
                                signupMap.set(label, signupMap.get(label)! + 1);
                            }
                        }
                    });

                    return {
                        totalUsers: users.length,
                        totalPublicMessages: pubCount.data().count,
                        totalConfessions: confCount.data().count,
                        totalAnonMessages: anonCount.data().count,
                        fieldDistribution: [...fieldMap.entries()].map(([field, count]) => ({ field, count })).sort((a, b) => b.count - a.count),
                        yearDistribution: [...yearMap.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => b.count - a.count),
                        genderDistribution: [...genderMap.entries()].map(([gender, count]) => ({ gender, count })).sort((a, b) => b.count - a.count),
                        signupTrend: monthLabels.map(label => ({ label, count: signupMap.get(label) || 0 })),
                    };
                },
                { ttl: 60_000, swr: 300_000 }
            );
            setData(analytics);
        } catch (e) {
            console.error('Analytics fetch error:', e);
            toast.error('Failed to load analytics.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.4s_ease-out]">
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/20 shrink-0">
                        <BarChart3 className="h-5 w-5 text-[var(--ui-accent)]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--ui-text)]">Platform Analytics</h1>
                        <p className="text-sm text-[var(--ui-text-muted)] mt-1">Enrollment distribution, engagement stats, and signup trends.</p>
                    </div>
                </div>
                <button
                    onClick={() => fetchAnalytics(true)}
                    disabled={refreshing}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] px-4 py-2.5 text-sm font-medium text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)] disabled:opacity-40 transition-colors"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="h-10 w-10 rounded-full border-2 border-[var(--ui-accent)]/30 border-t-[var(--ui-accent)] animate-spin" />
                    <p className="text-sm text-[var(--ui-text-muted)]">Crunching numbers...</p>
                </div>
            ) : data ? (
                <>
                    {/* Top-level stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard label="Total Users" value={data.totalUsers} icon={Users} />
                        <StatCard label="Public Messages" value={data.totalPublicMessages} icon={TrendingUp} />
                        <StatCard label="Confessions" value={data.totalConfessions} icon={TrendingUp} />
                        <StatCard label="Anon Messages" value={data.totalAnonMessages} icon={TrendingUp} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Field distribution */}
                        <div className="surface p-6">
                            <h2 className="text-lg font-semibold text-[var(--ui-text)] mb-1 flex items-center gap-2">
                                <GraduationCap className="h-4.5 w-4.5 text-[var(--ui-text-muted)]" />
                                By Field of Study
                            </h2>
                            <p className="text-xs text-[var(--ui-text-muted)] mb-4">Student distribution across academic fields</p>
                            <BarChart data={data.fieldDistribution.map(d => ({ label: d.field, count: d.count }))} />
                        </div>

                        {/* Year distribution */}
                        <div className="surface p-6">
                            <h2 className="text-lg font-semibold text-[var(--ui-text)] mb-1 flex items-center gap-2">
                                <Users className="h-4.5 w-4.5 text-[var(--ui-text-muted)]" />
                                By Year
                            </h2>
                            <p className="text-xs text-[var(--ui-text-muted)] mb-4">Distribution across academic years</p>
                            <BarChart data={data.yearDistribution.map(d => ({ label: d.year, count: d.count }))} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Gender distribution */}
                        <div className="surface p-6">
                            <h2 className="text-lg font-semibold text-[var(--ui-text)] mb-1">Gender Distribution</h2>
                            <p className="text-xs text-[var(--ui-text-muted)] mb-4">Self-reported gender breakdown</p>
                            <BarChart data={data.genderDistribution.map(d => ({ label: d.gender, count: d.count }))} />
                        </div>

                        {/* Signup trend */}
                        <div className="surface p-6">
                            <h2 className="text-lg font-semibold text-[var(--ui-text)] mb-1">Signup Trend (Last 6 Months)</h2>
                            <p className="text-xs text-[var(--ui-text-muted)] mb-4">New user registrations per month</p>
                            <BarChart data={data.signupTrend} />
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}

