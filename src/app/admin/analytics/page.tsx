'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, getCountFromServer, query, where, Timestamp } from 'firebase/firestore';
import { cacheGet, cacheInvalidate } from '@/lib/cache';
import { BarChart3, GraduationCap, RefreshCw, TrendingUp, Users, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar, Legend } from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';

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

interface TimeSeriesData {
    date: string;
    users: number;
    confessions: number;
    messages: number;
}

interface AnalyticsData {
    totalUsers: number;
    totalPublicMessages: number;
    totalConfessions: number;
    totalAnonMessages: number;
    fieldDistribution: FieldDistribution[];
    yearDistribution: YearDistribution[];
    genderDistribution: GenderDistribution[];
    timeSeries: TimeSeriesData[];
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
    const [dateRange, setDateRange] = useState<'7d' | '30d'>('7d');

    const fetchAnalytics = useCallback(async (isRefresh = false, range: '7d' | '30d') => {
        if (isRefresh) { setRefreshing(true); cacheInvalidate(`admin_analytics_${range}`); }
        else setLoading(true);

        try {
            const analytics = await cacheGet<AnalyticsData>(
                `admin_analytics_${range}`,
                async () => {
                    const days = range === '7d' ? 7 : 30;
                    const startDate = startOfDay(subDays(new Date(), days - 1));
                    const startTimestamp = Timestamp.fromDate(startDate);
                    const startMs = startDate.getTime();

                    // Generate date array for the x-axis
                    const dateIntervals = eachDayOfInterval({ start: startDate, end: new Date() });
                    const timeSeriesMap = new Map<string, TimeSeriesData>();
                    dateIntervals.forEach(d => {
                        timeSeriesMap.set(format(d, 'MMM dd'), { date: format(d, 'MMM dd'), users: 0, confessions: 0, messages: 0 });
                    });

                    // 1. Fetch users
                    const usersSnapshot = await getDocs(collection(db, 'users'));
                    const users = usersSnapshot.docs.map(d => d.data());

                    // 2. Fetch counts for top stats
                    const [pubCount, confCount, anonCount] = await Promise.all([
                        getCountFromServer(collection(db, 'public_chat')),
                        getCountFromServer(collection(db, 'confessions_public')),
                        getCountFromServer(collection(db, 'anonymous_public_chat_private')),
                    ]);

                    // 3. Fetch time-series data within range
                    const [recentConfessions, recentMessages] = await Promise.all([
                        getDocs(query(collection(db, 'confessions_public'), where('createdAt', '>=', startTimestamp))),
                        getDocs(query(collection(db, 'public_chat'), where('timestamp', '>=', startTimestamp))),
                    ]);

                    // Process Distributions
                    const fieldMap = new Map<string, number>();
                    const yearMap = new Map<string, number>();
                    const genderMap = new Map<string, number>();

                    users.forEach(u => {
                        // Distributions
                        const field = (u.field as string) || 'Unknown';
                        fieldMap.set(field, (fieldMap.get(field) || 0) + 1);

                        const year = (u.year as string) || 'Unknown';
                        yearMap.set(year, (yearMap.get(year) || 0) + 1);

                        const gender = (u.gender as string) || 'other';
                        const gLabel = gender.charAt(0).toUpperCase() + gender.slice(1);
                        genderMap.set(gLabel, (genderMap.get(gLabel) || 0) + 1);

                        // User Signups Time Series
                        const createdAt = u.createdAt as number | undefined;
                        if (createdAt && createdAt >= startMs) {
                            const dateLabel = format(new Date(createdAt), 'MMM dd');
                            if (timeSeriesMap.has(dateLabel)) {
                                timeSeriesMap.get(dateLabel)!.users += 1;
                            }
                        }
                    });

                    // Process Confession Time Series
                    recentConfessions.forEach(doc => {
                        const ts = doc.data().createdAt as Timestamp;
                        if (ts) {
                            const dateLabel = format(ts.toDate(), 'MMM dd');
                            if (timeSeriesMap.has(dateLabel)) {
                                timeSeriesMap.get(dateLabel)!.confessions += 1;
                            }
                        }
                    });

                    // Process Message Time Series
                    recentMessages.forEach(doc => {
                        const ts = doc.data().timestamp as Timestamp;
                        if (ts) {
                            const dateLabel = format(ts.toDate(), 'MMM dd');
                            if (timeSeriesMap.has(dateLabel)) {
                                timeSeriesMap.get(dateLabel)!.messages += 1;
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
                        timeSeries: Array.from(timeSeriesMap.values()),
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

    useEffect(() => {
        fetchAnalytics(false, dateRange);
    }, [fetchAnalytics, dateRange]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="surface p-3 ring-1 ring-[var(--ui-border)] shadow-xl rounded-lg min-w-[150px]">
                    <p className="text-sm font-bold text-[var(--ui-text)] mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4 text-xs">
                            <span className="flex items-center gap-1.5 text-[var(--ui-text-muted)]">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                {entry.name}
                            </span>
                            <span className="font-semibold text-[var(--ui-text)]">{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="max-w-6xl mx-auto pb-12 font-sans animate-[fade-in-up_0.4s_ease-out]">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ui-accent-dim)] ring-1 ring-[var(--ui-accent)]/20 shrink-0">
                        <BarChart3 className="h-5 w-5 text-[var(--ui-accent)]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-[var(--ui-text)]">Platform Analytics</h1>
                        <p className="text-sm text-[var(--ui-text-muted)] mt-1">Enrollment distribution, engagement stats, and signup trends.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-[var(--ui-bg-elevated)] rounded-lg p-1 border border-[var(--ui-border)]">
                        <button
                            onClick={() => setDateRange('7d')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dateRange === '7d' ? 'bg-[var(--ui-accent)] text-white shadow-sm' : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'}`}
                        >
                            7 Days
                        </button>
                        <button
                            onClick={() => setDateRange('30d')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${dateRange === '30d' ? 'bg-[var(--ui-accent)] text-white shadow-sm' : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'}`}
                        >
                            30 Days
                        </button>
                    </div>
                    <button
                        onClick={() => fetchAnalytics(true, dateRange)}
                        disabled={refreshing}
                        className="p-2.5 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] text-[var(--ui-text-secondary)] hover:bg-[var(--ui-bg-hover)] hover:text-[var(--ui-text)] disabled:opacity-40 transition-colors"
                        title="Refresh Data"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
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

                    {/* Time Series Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Engagement Activity */}
                        <div className="surface p-6">
                            <h2 className="text-lg font-semibold text-[var(--ui-text)] mb-1 flex items-center gap-2">
                                <TrendingUp className="h-4.5 w-4.5 text-[var(--ui-text-muted)]" />
                                Platform Engagement
                            </h2>
                            <p className="text-xs text-[var(--ui-text-muted)] mb-6">Daily confessions and public messages</p>
                            
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.timeSeries} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorConfessions" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ui-border)" opacity={0.5} />
                                        <XAxis 
                                            dataKey="date" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 11, fill: 'var(--ui-text-muted)' }} 
                                            dy={10}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 11, fill: 'var(--ui-text-muted)' }} 
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                        <Area type="monotone" name="Messages" dataKey="messages" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorMessages)" />
                                        <Area type="monotone" name="Confessions" dataKey="confessions" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorConfessions)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* User Growth */}
                        <div className="surface p-6">
                            <h2 className="text-lg font-semibold text-[var(--ui-text)] mb-1 flex items-center gap-2">
                                <Calendar className="h-4.5 w-4.5 text-[var(--ui-text-muted)]" />
                                User Registration Growth
                            </h2>
                            <p className="text-xs text-[var(--ui-text-muted)] mb-6">New student signups per day</p>
                            
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsBarChart data={data.timeSeries} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ui-border)" opacity={0.5} />
                                        <XAxis 
                                            dataKey="date" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 11, fill: 'var(--ui-text-muted)' }} 
                                            dy={10}
                                        />
                                        <YAxis 
                                            allowDecimals={false}
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 11, fill: 'var(--ui-text-muted)' }} 
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--ui-bg-hover)' }} />
                                        <Bar name="New Users" dataKey="users" fill="var(--ui-accent)" radius={[4, 4, 0, 0]} />
                                    </RechartsBarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Field distribution */}
                        <div className="surface p-6">
                            <h2 className="text-lg font-semibold text-[var(--ui-text)] mb-1 flex items-center gap-2">
                                <GraduationCap className="h-4.5 w-4.5 text-[var(--ui-text-muted)]" />
                                By Field of Study
                            </h2>
                            <p className="text-xs text-[var(--ui-text-muted)] mb-6">Student distribution across academic fields</p>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsBarChart data={data.fieldDistribution} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--ui-border)" opacity={0.5} />
                                        <XAxis type="number" hide />
                                        <YAxis 
                                            type="category" 
                                            dataKey="field" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            width={120}
                                            tick={{ fontSize: 11, fill: 'var(--ui-text-muted)' }} 
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--ui-bg-hover)' }} />
                                        <Bar name="Students" dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                                    </RechartsBarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Year & Gender distribution */}
                        <div className="space-y-6">
                            {/* Year distribution */}
                            <div className="surface p-6">
                                <h2 className="text-lg font-semibold text-[var(--ui-text)] mb-1 flex items-center gap-2">
                                    <Users className="h-4.5 w-4.5 text-[var(--ui-text-muted)]" />
                                    By Year
                                </h2>
                                <p className="text-xs text-[var(--ui-text-muted)] mb-6">Distribution across academic years</p>
                                <div className="h-[180px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RechartsBarChart data={data.yearDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ui-border)" opacity={0.5} />
                                            <XAxis 
                                                dataKey="year" 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fontSize: 11, fill: 'var(--ui-text-muted)' }} 
                                                dy={10}
                                            />
                                            <YAxis 
                                                allowDecimals={false}
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fontSize: 11, fill: 'var(--ui-text-muted)' }} 
                                            />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--ui-bg-hover)' }} />
                                            <Bar name="Students" dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} />
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            
                            {/* Gender Distribution */}
                            <div className="surface p-6">
                                <h2 className="text-lg font-semibold text-[var(--ui-text)] mb-1">Gender Distribution</h2>
                                <div className="flex gap-4 mt-4">
                                    {data.genderDistribution.map(g => (
                                        <div key={g.gender} className="flex-1 bg-[var(--ui-bg-elevated)] rounded-lg p-3 text-center border border-[var(--ui-border)]">
                                            <p className="text-2xl font-bold text-[var(--ui-text)]">{g.count}</p>
                                            <p className="text-xs text-[var(--ui-text-muted)] mt-1">{g.gender}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}
