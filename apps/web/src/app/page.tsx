'use client';

import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store/useStore';
import { Home, MessageSquare, Users, MessageCircle, Mail, User, Settings, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
      duration: 0.5
    } 
  }
};

export default function DashboardPage() {
  const { userProfile } = useStore();

  const channels = [
    { name: 'Confessions', description: 'Share secrets anonymously', icon: MessageSquare, href: '/confessions', tag: '50+', color: 'from-amber-500/20 to-orange-500/20' },
    { name: 'Public Chat', description: 'Campus-wide real-time chat', icon: Users, href: '/public-chat', tag: 'Live', color: 'from-blue-500/20 to-indigo-500/20' },
    { name: 'Anonymous Chat', description: 'Speak freely in the shadows', icon: MessageCircle, href: '/anonymous-chat', tag: 'Anonymous', color: 'from-purple-500/20 to-fuchsia-500/20' },
  ];

  const quickLinks = [
    { name: 'Groups', icon: Users, href: '/groups' },
    { name: 'Messages', icon: Mail, href: '/messages' },
    { name: 'Profile', icon: User, href: '/profile' },
    { name: 'Settings', icon: Settings, href: '/settings' },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="Dashboard" description="Your overview" icon={<Home className="h-4.5 w-4.5" />} />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-4 sm:p-6 max-w-5xl mx-auto"
      >
        {/* Welcome */}
        <motion.div variants={itemVariants} className="mb-8 relative overflow-hidden rounded-[32px] p-8 bg-gradient-to-br from-[var(--ui-accent)]/10 via-[var(--ui-accent)]/5 to-transparent border border-[var(--ui-accent)]/10 shadow-sm group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Sparkles className="w-24 h-24 text-[var(--ui-accent)] rotate-12" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-[var(--ui-text)] tracking-tight">
              {getTimeGreeting()}, <span className="text-[var(--ui-accent)]">{userProfile?.name?.split(' ')[0]}</span>!
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="px-2.5 py-1 rounded-full bg-[var(--ui-bg-elevated)]/50 backdrop-blur-md border border-[var(--ui-border)] text-[11px] font-semibold text-[var(--ui-text-secondary)] uppercase tracking-wider">
                    {userProfile?.field}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[var(--ui-bg-elevated)]/50 backdrop-blur-md border border-[var(--ui-border)] text-[11px] font-semibold text-[var(--ui-text-secondary)] uppercase tracking-wider">
                    {userProfile?.year}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[var(--ui-bg-elevated)]/50 backdrop-blur-md border border-[var(--ui-border)] text-[11px] font-semibold text-[var(--ui-text-secondary)] uppercase tracking-wider">
                    {userProfile?.division} ({userProfile?.branch})
                </span>
            </div>
          </div>
        </motion.div>

        {/* Channel Cards */}
        <div className="mb-8">
          <motion.h3 variants={itemVariants} className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ui-text-muted)] mb-4 px-1">
            Featured Chat Rooms
          </motion.h3>
          <div className="grid gap-3">
            {channels.map((ch) => (
              <motion.div key={ch.name} variants={itemVariants}>
                <Link
                  href={ch.href}
                  className="relative flex items-center gap-4 px-5 py-4 group rounded-2xl bg-[var(--ui-bg-elevated)]/40 backdrop-blur-md border border-[var(--ui-border)] hover:border-[var(--ui-accent)]/30 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${ch.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ui-accent-dim)] shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <ch.icon className="h-5 w-5 text-[var(--ui-accent)]" />
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-[var(--ui-text)] tracking-tight">
                      {ch.name}
                    </p>
                    <p className="text-xs text-[var(--ui-text-muted)] group-hover:text-[var(--ui-text-secondary)] truncate transition-colors">
                        {ch.description}
                    </p>
                  </div>
                  <div className="relative flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ui-accent)] bg-[var(--ui-accent-dim)] px-2.5 py-1 rounded-full ring-1 ring-[var(--ui-accent)]/20">
                      {ch.tag}
                    </span>
                    <div className="p-2 rounded-full bg-[var(--ui-bg-elevated)] opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                        <ArrowRight className="h-4 w-4 text-[var(--ui-accent)]" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <motion.h3 variants={itemVariants} className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--ui-text-muted)] mb-4 px-1">
            Quick Actions
          </motion.h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickLinks.map((action) => (
              <motion.div key={action.name} variants={itemVariants}>
                <Link
                  href={action.href}
                  className="flex flex-col items-center justify-center py-6 px-4 group rounded-2xl bg-[var(--ui-bg-elevated)]/40 backdrop-blur-md border border-[var(--ui-border)] hover:border-[var(--ui-accent)]/30 hover:bg-[var(--ui-bg-elevated)]/60 transition-all duration-300 shadow-sm"
                >
                  <div className="h-12 w-12 rounded-xl bg-[var(--ui-bg-elevated)] flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-sm">
                    <action.icon className="h-6 w-6 text-[var(--ui-text-muted)] group-hover:text-[var(--ui-accent)] transition-colors" />
                  </div>
                  <span className="text-sm font-bold text-[var(--ui-text-secondary)] group-hover:text-[var(--ui-text)] transition-colors">
                    {action.name}
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
