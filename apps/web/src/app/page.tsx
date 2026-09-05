'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { 
    MessageSquare, Users, MessageCircle, 
    Mail, User, Settings, Sparkles,
    ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 22) return 'Good evening';
  return 'Good night';
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants: Variants = {
  hidden: { y: 15, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
};

export default function DashboardPage() {
  const { userProfile } = useStore();

  const channels = [
    { 
        id: 'confessions',
        name: 'Confessions', 
        description: 'Share your campus secrets anonymously', 
        icon: MessageSquare, 
        href: '/confessions', 
        tag: 'Trending', 
        color: 'text-amber-500',
        bgHover: 'hover:bg-amber-500/5',
        borderHover: 'hover:border-amber-500/30'
    },
    { 
        id: 'public',
        name: 'Public Chat', 
        description: 'Join the campus-wide real-time discussion', 
        icon: Users, 
        href: '/public-chat', 
        tag: 'Live', 
        color: 'text-blue-500',
        bgHover: 'hover:bg-blue-500/5',
        borderHover: 'hover:border-blue-500/30'
    },
    { 
        id: 'anon',
        name: 'Anonymous Chat', 
        description: 'Speak freely in the shadows', 
        icon: MessageCircle, 
        href: '/anonymous-chat', 
        tag: 'Secure', 
        color: 'text-emerald-500',
        bgHover: 'hover:bg-emerald-500/5',
        borderHover: 'hover:border-emerald-500/30'
    },
  ];

  const quickLinks = [
    { name: 'Inbox', icon: Mail, href: '/messages' },
    { name: 'Groups', icon: Users, href: '/groups' },
    { name: 'Profile', icon: User, href: '/profile' },
    { name: 'Settings', icon: Settings, href: '/settings' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-10 min-h-screen">
          
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-10"
        >
            {/* Header Section */}
            <motion.div variants={itemVariants} className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] text-[11px] font-medium text-[var(--ui-text-muted)] uppercase tracking-widest">
                    <Sparkles className="h-3 w-3 text-[var(--ui-accent)]" />
                    Overview
                </div>
                
                <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--ui-text)] tracking-tight">
                    {getTimeGreeting()}, <br className="sm:hidden" />
                    <span className="text-[var(--ui-accent)]">{userProfile?.name?.split(' ')[0]}</span>.
                </h1>
                
                <div className="flex flex-wrap items-center gap-3 pt-2">
                    {userProfile?.field && (
                        <div className="px-4 py-1.5 rounded-lg bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] text-xs font-semibold text-[var(--ui-text-secondary)]">
                            {userProfile.field}
                        </div>
                    )}
                    {userProfile?.year && (
                        <div className="px-4 py-1.5 rounded-lg bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] text-xs font-semibold text-[var(--ui-text-secondary)]">
                            {userProfile.year}
                        </div>
                    )}
                    {userProfile?.division && (
                        <div className="px-4 py-1.5 rounded-lg bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] text-xs font-semibold text-[var(--ui-text-secondary)]">
                            Div {userProfile.division} {userProfile.branch && <span className="text-[var(--ui-text-muted)] font-normal ml-1">• {userProfile.branch}</span>}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Channels List */}
            <motion.div variants={itemVariants} className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ui-text-muted)] pl-1">
                    Active Spaces
                </h2>
                <div className="flex flex-col gap-3">
                    {channels.map((ch) => (
                        <Link 
                            key={ch.id} 
                            href={ch.href}
                            className={`group flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] transition-all duration-300 ${ch.bgHover} ${ch.borderHover} shadow-sm hover:shadow-md cursor-pointer`}
                        >
                            <div className="flex items-center gap-4 sm:gap-6">
                                <div className={`flex items-center justify-center h-12 w-12 rounded-xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] group-hover:scale-110 transition-transform duration-300 ${ch.color}`}>
                                    <ch.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-base sm:text-lg font-bold text-[var(--ui-text)] group-hover:text-[var(--ui-text)] transition-colors">
                                            {ch.name}
                                        </h3>
                                        <span className={`text-[9px] uppercase tracking-wider font-black px-2 py-0.5 rounded-full bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] ${ch.color}`}>
                                            {ch.tag}
                                        </span>
                                    </div>
                                    <p className="text-sm text-[var(--ui-text-muted)] group-hover:text-[var(--ui-text-secondary)] transition-colors line-clamp-1">
                                        {ch.description}
                                    </p>
                                </div>
                            </div>
                            <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                <ChevronRight className="h-5 w-5 text-[var(--ui-text-secondary)]" />
                            </div>
                        </Link>
                    ))}
                </div>
            </motion.div>

            {/* Quick Links */}
            <motion.div variants={itemVariants} className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--ui-text-muted)] pl-1">
                    Quick Actions
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {quickLinks.map((link) => (
                        <Link 
                            key={link.name} 
                            href={link.href}
                            className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-elevated)] hover:border-[var(--ui-accent)]/30 transition-all duration-300 shadow-sm"
                        >
                            <link.icon className="h-6 w-6 mb-3 text-[var(--ui-text-muted)] group-hover:text-[var(--ui-accent)] transition-colors" />
                            <span className="text-sm font-semibold text-[var(--ui-text-secondary)] group-hover:text-[var(--ui-text)] transition-colors">
                                {link.name}
                            </span>
                        </Link>
                    ))}
                </div>
            </motion.div>

        </motion.div>
      </div>
    </DashboardLayout>
  );
}
