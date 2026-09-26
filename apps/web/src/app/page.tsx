'use client';

import { useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store/useStore';
import { 
  Home, MessageSquare, Users, MessageCircle, Mail, User, 
  Settings, ArrowRight, Sparkles, Shield, Flame, Radio, 
  Lock, BookOpen, GraduationCap, ChevronRight, Activity
} from 'lucide-react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';

function getTimeOfDayInfo() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) {
    return {
      greeting: 'Good morning',
      tag: 'Morning Campus Vibe',
      gradient: 'from-amber-500/15 via-orange-500/10 to-rose-500/5',
      mesh: 'radial-gradient(circle at 15% 20%, rgba(245, 158, 11, 0.12) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(244, 63, 94, 0.1) 0%, transparent 40%)',
      accentColor: 'text-amber-500 dark:text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20',
    };
  }
  if (h >= 12 && h < 17) {
    return {
      greeting: 'Good afternoon',
      tag: 'Midday Pulse',
      gradient: 'from-sky-500/15 via-blue-500/10 to-indigo-500/5',
      mesh: 'radial-gradient(circle at 15% 25%, rgba(56, 189, 248, 0.12) 0%, transparent 45%), radial-gradient(circle at 85% 75%, rgba(99, 102, 241, 0.12) 0%, transparent 40%)',
      accentColor: 'text-sky-500 dark:text-sky-400',
      badgeBg: 'bg-sky-500/10 text-sky-500 dark:text-sky-400 border-sky-500/20',
    };
  }
  if (h >= 17 && h < 21) {
    return {
      greeting: 'Good evening',
      tag: 'Sunset Hours',
      gradient: 'from-indigo-500/15 via-purple-500/10 to-pink-500/5',
      mesh: 'radial-gradient(circle at 20% 20%, rgba(129, 140, 248, 0.14) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(236, 72, 153, 0.12) 0%, transparent 40%)',
      accentColor: 'text-indigo-500 dark:text-indigo-400',
      badgeBg: 'bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/20',
    };
  }
  return {
    greeting: 'Good night',
    tag: 'Late Night Ops',
    gradient: 'from-violet-500/15 via-purple-500/10 to-emerald-500/5',
    mesh: 'radial-gradient(circle at 15% 30%, rgba(139, 92, 246, 0.14) 0%, transparent 45%), radial-gradient(circle at 85% 70%, rgba(16, 185, 129, 0.08) 0%, transparent 40%)',
    accentColor: 'text-violet-500 dark:text-violet-400',
    badgeBg: 'bg-violet-500/10 text-violet-500 dark:text-violet-400 border-violet-500/20',
  };
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { y: 16, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
      type: 'spring',
      stiffness: 280,
      damping: 22,
    },
  },
};

export default function DashboardPage() {
  const { userProfile } = useStore();
  const timeInfo = useMemo(() => getTimeOfDayInfo(), []);

  const quickLinks = [
    { name: 'Groups', icon: Users, href: '/groups', desc: 'Cohort discussions' },
    { name: 'Messages', icon: Mail, href: '/messages', desc: 'Direct DMs' },
    { name: 'Profile', icon: User, href: '/profile', desc: 'Student credentials' },
    { name: 'Settings', icon: Settings, href: '/settings', desc: 'Preferences & privacy' },
  ];

  return (
    <DashboardLayout>
      <PageHeader 
        title="Dashboard" 
        description="Your unified DYPU campus portal" 
        icon={<Home className="h-4.5 w-4.5" />} 
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-3 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8"
      >
        {/* ═══════ Welcome Bento Tile ═══════ */}
        <motion.div 
          variants={itemVariants} 
          className="relative overflow-hidden rounded-3xl p-6 sm:p-8 md:p-10 bg-[var(--ui-bg-surface)]/80 backdrop-blur-xl border border-[var(--ui-border)] shadow-xl group transition-all duration-500 hover:shadow-2xl hover:border-[var(--ui-accent)]/30"
          style={{ backgroundImage: timeInfo.mesh }}
        >
          {/* Ambient gradient layer */}
          <div className={`absolute inset-0 bg-gradient-to-br ${timeInfo.gradient} pointer-events-none opacity-80`} />

          {/* Animated sparkler corner decoration */}
          <div className="absolute top-0 right-0 p-6 sm:p-8 pointer-events-none">
            <motion.div
              animate={{ 
                rotate: [0, 10, -8, 0],
                scale: [1, 1.06, 0.96, 1],
              }}
              transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
              className="opacity-25 group-hover:opacity-45 transition-opacity duration-700"
            >
              <Sparkles className="w-20 h-20 sm:w-28 sm:h-28 text-[var(--ui-accent)]" />
            </motion.div>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              {/* Quick Status Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--ui-bg-elevated)]/90 backdrop-blur-md border border-[var(--ui-border)] shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ui-text-secondary)]">
                  Campus Live
                </span>
                <span className="text-[10px] text-[var(--ui-text-muted)]">•</span>
                <span className={`text-[11px] font-semibold ${timeInfo.accentColor}`}>
                  {timeInfo.tag}
                </span>
              </div>

              {/* Title & Greeting */}
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--ui-text)] tracking-tight leading-tight">
                  {timeInfo.greeting},{' '}
                  <span className="text-[var(--ui-accent)] drop-shadow-sm font-black">
                    {userProfile?.name?.split(' ')[0] || 'Student'}
                  </span>!
                </h2>
                <p className="text-sm sm:text-base text-[var(--ui-text-secondary)] font-medium mt-1.5">
                  Welcome to your campus hub. Connect, share, and collaborate with your peers.
                </p>
              </div>

              {/* Student info badges with glass chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {userProfile?.field && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ui-bg-elevated)]/80 backdrop-blur-md border border-[var(--ui-border)] text-xs font-bold text-[var(--ui-text-secondary)] shadow-sm hover:border-[var(--ui-accent)]/40 transition-colors">
                    <BookOpen className="w-3.5 h-3.5 text-[var(--ui-accent)]" />
                    <span>{userProfile.field}</span>
                  </div>
                )}
                {userProfile?.year && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ui-bg-elevated)]/80 backdrop-blur-md border border-[var(--ui-border)] text-xs font-bold text-[var(--ui-text-secondary)] shadow-sm hover:border-[var(--ui-accent)]/40 transition-colors">
                    <GraduationCap className="w-3.5 h-3.5 text-[var(--ui-accent)]" />
                    <span>{userProfile.year}</span>
                  </div>
                )}
                {userProfile?.division && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--ui-bg-elevated)]/80 backdrop-blur-md border border-[var(--ui-border)] text-xs font-bold text-[var(--ui-text-secondary)] shadow-sm hover:border-[var(--ui-accent)]/40 transition-colors">
                    <span className="text-[var(--ui-text-muted)] font-normal">Div</span>
                    <span>{userProfile.division}</span>
                    {userProfile.branch && (
                      <span className="text-[var(--ui-text-muted)] font-normal">• {userProfile.branch}</span>
                    )}
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-sm">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Verified Student</span>
                </div>
              </div>
            </div>

            {/* Quick action button link to groups */}
            <div className="shrink-0 flex items-center">
              <Link
                href="/groups"
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-[var(--ui-accent)] text-white text-sm font-bold shadow-lg shadow-[var(--ui-accent)]/25 hover:shadow-[var(--ui-accent)]/40 hover:opacity-95 transition-all active:scale-95 group/btn"
              >
                <span>Jump to Cohort</span>
                <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ═══════ Spaces Bento Grid ═══════ */}
        <div>
          <div className="flex items-center justify-between mb-4 px-2">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--ui-text-muted)]">
                Active Spaces
              </h3>
              <p className="text-xs text-[var(--ui-text-secondary)]">Explore core student communication channels</p>
            </div>
            <span className="text-xs font-bold text-[var(--ui-accent)] flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 animate-pulse" /> 3 Live Networks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Tile 1: Confessions */}
            <motion.div variants={itemVariants} className="h-full">
              <Link
                href="/confessions"
                className="group relative flex flex-col justify-between h-full min-h-[220px] p-6 rounded-3xl bg-[var(--ui-bg-surface)]/90 backdrop-blur-xl border border-amber-500/25 hover:border-amber-500/60 shadow-lg hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 overflow-hidden hover:-translate-y-1"
              >
                {/* Amber/orange ambient glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent pointer-events-none group-hover:opacity-100 opacity-75 transition-opacity" />
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    {/* Trending tag */}
                    <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400 text-[11px] font-black uppercase tracking-wider shadow-sm">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      <span>Trending</span>
                    </div>
                  </div>

                  <h4 className="text-xl font-black text-[var(--ui-text)] tracking-tight group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">
                    Confessions
                  </h4>
                  <p className="text-xs text-[var(--ui-text-muted)] mt-1 font-semibold">
                    Spill the tea anonymously
                  </p>

                  {/* Live preview quote snippet */}
                  <div className="mt-4 p-3 rounded-xl bg-[var(--ui-bg-elevated)]/75 border border-amber-500/20 text-xs text-[var(--ui-text-secondary)] italic leading-relaxed line-clamp-2">
                    &ldquo;Spill campus thoughts with total peace of mind • Pseudonymous &amp; student-led&rdquo;
                  </div>
                </div>

                <div className="relative z-10 pt-4 flex items-center justify-between text-xs font-bold text-amber-500 dark:text-amber-400">
                  <span>Enter Confessions</span>
                  <motion.div
                    className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/15 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm"
                    whileHover={{ x: 3 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.div>
                </div>
              </Link>
            </motion.div>

            {/* Tile 2: Public Chat */}
            <motion.div variants={itemVariants} className="h-full">
              <Link
                href="/public-chat"
                className="group relative flex flex-col justify-between h-full min-h-[220px] p-6 rounded-3xl bg-[var(--ui-bg-surface)]/90 backdrop-blur-xl border border-blue-500/25 hover:border-blue-500/60 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 overflow-hidden hover:-translate-y-1"
              >
                {/* Indigo/blue gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-transparent pointer-events-none group-hover:opacity-100 opacity-75 transition-opacity" />
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                      <Users className="h-6 w-6" />
                    </div>

                    {/* Live pulse indicator & animated chatter dots */}
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-500 dark:text-blue-400 text-[11px] font-black uppercase tracking-wider shadow-sm">
                      <span className="relative flex h-2 w-2 mr-0.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                      </span>
                      <span>Live</span>
                      <span className="flex items-center gap-0.5 ml-1">
                        <motion.span
                          className="w-1 h-1 rounded-full bg-blue-400"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                        />
                        <motion.span
                          className="w-1 h-1 rounded-full bg-blue-400"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.span
                          className="w-1 h-1 rounded-full bg-blue-400"
                          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                        />
                      </span>
                    </div>
                  </div>

                  <h4 className="text-xl font-black text-[var(--ui-text)] tracking-tight group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                    Public Chat
                  </h4>
                  <p className="text-xs text-[var(--ui-text-muted)] mt-1 font-semibold">
                    Campus-wide real-time discussion
                  </p>

                  <div className="mt-4 p-3 rounded-xl bg-[var(--ui-bg-elevated)]/75 border border-blue-500/20 text-xs text-[var(--ui-text-secondary)] leading-relaxed">
                    Open lounge for students across all engineering branches, clubs, and events.
                  </div>
                </div>

                <div className="relative z-10 pt-4 flex items-center justify-between text-xs font-bold text-blue-500 dark:text-blue-400">
                  <span>Join Discussion</span>
                  <motion.div
                    className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-500/15 border border-blue-500/30 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm"
                    whileHover={{ x: 3 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.div>
                </div>
              </Link>
            </motion.div>

            {/* Tile 3: Anonymous Chat */}
            <motion.div variants={itemVariants} className="h-full">
              <Link
                href="/anonymous-chat"
                className="group relative flex flex-col justify-between h-full min-h-[220px] p-6 rounded-3xl bg-[var(--ui-bg-surface)]/90 backdrop-blur-xl border border-emerald-500/25 hover:border-emerald-500/60 shadow-lg hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 overflow-hidden hover:-translate-y-1"
              >
                {/* Emerald/teal glowing card */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent pointer-events-none group-hover:opacity-100 opacity-75 transition-opacity" />
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                      <MessageCircle className="h-6 w-6" />
                    </div>

                    {/* Stealth shield & Zero Trace badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-[11px] font-black uppercase tracking-wider shadow-sm">
                      <Shield className="w-3.5 h-3.5 fill-current" />
                      <span>Zero Trace</span>
                    </div>
                  </div>

                  <h4 className="text-xl font-black text-[var(--ui-text)] tracking-tight group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                    Anonymous Chat
                  </h4>
                  <p className="text-xs text-[var(--ui-text-muted)] mt-1 font-semibold">
                    Speak freely in the shadows
                  </p>

                  <div className="mt-4 p-3 rounded-xl bg-[var(--ui-bg-elevated)]/75 border border-emerald-500/20 text-xs text-[var(--ui-text-secondary)] leading-relaxed">
                    Ephemeral peer-to-peer anonymous messaging with randomized handles and zero logs.
                  </div>
                </div>

                <div className="relative z-10 pt-4 flex items-center justify-between text-xs font-bold text-emerald-500 dark:text-emerald-400">
                  <span>Enter Stealth Mode</span>
                  <motion.div
                    className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-sm"
                    whileHover={{ x: 3 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.div>
                </div>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* ═══════ Campus Activity & Metrics Tile ═══════ */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 p-5 sm:p-6 rounded-3xl bg-[var(--ui-bg-surface)]/80 backdrop-blur-xl border border-[var(--ui-border)] shadow-md flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-[var(--ui-accent)]/10 text-[var(--ui-accent)]">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-extrabold text-[var(--ui-text)] tracking-tight">
                    Campus Network Overview
                  </h4>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ui-text-muted)] bg-[var(--ui-bg-elevated)] px-2.5 py-1 rounded-full border border-[var(--ui-border)]">
                  All Systems Online
                </span>
              </div>
              <p className="text-xs text-[var(--ui-text-secondary)] mb-4">
                DYPU-Connect bridges student conversations with real-time Firestore sync, client-side safety guardrails, and role-based access.
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[var(--ui-divider)]">
                <div className="text-center p-2 rounded-xl bg-[var(--ui-bg-elevated)]/50">
                  <p className="text-lg font-black text-[var(--ui-accent)]">100%</p>
                  <p className="text-[10px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider">Encrypted</p>
                </div>
                <div className="text-center p-2 rounded-xl bg-[var(--ui-bg-elevated)]/50">
                  <p className="text-lg font-black text-emerald-500">Real-Time</p>
                  <p className="text-[10px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider">WebSockets</p>
                </div>
                <div className="text-center p-2 rounded-xl bg-[var(--ui-bg-elevated)]/50">
                  <p className="text-lg font-black text-blue-500">Zero-Log</p>
                  <p className="text-[10px] font-bold text-[var(--ui-text-muted)] uppercase tracking-wider">Anonymous</p>
                </div>
              </div>
            </div>

            {/* Quick Security & Shield Info */}
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[var(--ui-bg-surface)] to-[var(--ui-bg-elevated)] border border-[var(--ui-border)] shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2 text-[var(--ui-accent)]">
                  <Lock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wide">Campus Safety</span>
                </div>
                <h5 className="text-base font-extrabold text-[var(--ui-text)] mb-1">
                  Privacy First Architecture
                </h5>
                <p className="text-xs text-[var(--ui-text-muted)] leading-relaxed">
                  Confessions &amp; anonymous sessions are cryptographically separated from your student identity.
                </p>
              </div>
              <div className="pt-3 mt-3 border-t border-[var(--ui-divider)] flex items-center justify-between text-xs text-[var(--ui-text-secondary)] font-semibold">
                <span>Safe Community</span>
                <span className="text-[var(--ui-accent)]">AI Moderated</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══════ Quick Actions Dock ═══════ */}
        <div>
          <div className="flex items-center justify-between mb-4 px-2">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--ui-text-muted)]">
                Quick Actions Dock
              </h3>
              <p className="text-xs text-[var(--ui-text-secondary)]">Direct access to core student workspaces</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {quickLinks.map((action) => (
              <motion.div 
                key={action.name} 
                variants={itemVariants}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 350, damping: 20 }}
              >
                <Link
                  href={action.href}
                  className="flex flex-col items-center justify-center p-5 sm:p-6 group rounded-3xl bg-[var(--ui-bg-surface)]/90 backdrop-blur-xl border border-[var(--ui-border)] hover:border-[var(--ui-accent)]/50 hover:bg-[var(--ui-bg-elevated)] transition-all duration-300 shadow-md hover:shadow-xl relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--ui-accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <div className="h-14 w-14 rounded-2xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[var(--ui-accent)]/15 group-hover:border-[var(--ui-accent)]/30 transition-all duration-300 shadow-inner">
                    <action.icon className="h-6 w-6 text-[var(--ui-text-secondary)] group-hover:text-[var(--ui-accent)] transition-colors" />
                  </div>
                  
                  <span className="text-sm font-black text-[var(--ui-text)] group-hover:text-[var(--ui-accent)] transition-colors">
                    {action.name}
                  </span>
                  
                  <span className="text-[11px] text-[var(--ui-text-muted)] font-medium mt-0.5 text-center truncate max-w-full">
                    {action.desc}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
