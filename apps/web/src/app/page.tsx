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
            staggerChildren: 0.08
        }
    }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { 
      duration: 0.4
    } 
  }
};

export default function DashboardPage() {
  const { userProfile } = useStore();

  const channels = [
    { name: 'Confessions', description: 'Share secrets anonymously', icon: MessageSquare, href: '/confessions', tag: 'Trending', color: 'from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20' },
    { name: 'Public Chat', description: 'Campus-wide real-time chat', icon: Users, href: '/public-chat', tag: 'Live', color: 'from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20' },
    { name: 'Anonymous Chat', description: 'Speak freely in the shadows', icon: MessageCircle, href: '/anonymous-chat', tag: 'Secure', color: 'from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20' },
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
        className="p-4 sm:p-6 max-w-4xl mx-auto space-y-10"
      >
        {/* Welcome */}
        <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2rem] p-8 sm:p-10 bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] shadow-lg group transition-all duration-500 hover:shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--ui-accent)]/5 to-transparent opacity-50" />
          <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity duration-700">
            <Sparkles className="w-28 h-28 text-[var(--ui-accent)] rotate-12" />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--ui-text)] tracking-tight mb-4">
              {getTimeGreeting()}, <span className="text-[var(--ui-accent)] drop-shadow-sm">{userProfile?.name?.split(' ')[0]}</span>!
            </h2>
            <div className="flex flex-wrap items-center gap-2.5">
                {userProfile?.field && (
                  <span className="px-3 py-1.5 rounded-xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] text-xs font-bold text-[var(--ui-text-secondary)] shadow-sm">
                      {userProfile.field}
                  </span>
                )}
                {userProfile?.year && (
                  <span className="px-3 py-1.5 rounded-xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] text-xs font-bold text-[var(--ui-text-secondary)] shadow-sm">
                      {userProfile.year}
                  </span>
                )}
                {userProfile?.division && (
                  <span className="px-3 py-1.5 rounded-xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] text-xs font-bold text-[var(--ui-text-secondary)] shadow-sm">
                      Div {userProfile.division} {userProfile.branch && <span className="font-normal text-[var(--ui-text-muted)] ml-1">• {userProfile.branch}</span>}
                  </span>
                )}
            </div>
          </div>
        </motion.div>

        {/* Channel Cards */}
        <div>
          <motion.h3 variants={itemVariants} className="text-xs font-bold uppercase tracking-widest text-[var(--ui-text-muted)] mb-4 pl-2">
            Active Spaces
          </motion.h3>
          <div className="grid gap-4">
            {channels.map((ch) => (
              <motion.div key={ch.name} variants={itemVariants}>
                <Link
                  href={ch.href}
                  className="relative flex items-center gap-5 px-6 py-5 group rounded-[1.5rem] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] hover:border-[var(--ui-accent)]/40 transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${ch.color} transition-colors duration-500`} />
                  
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-inner">
                    <ch.icon className="h-6 w-6 text-[var(--ui-text-secondary)] group-hover:text-[var(--ui-text)] transition-colors" />
                  </div>
                  
                  <div className="relative flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-base font-bold text-[var(--ui-text)] tracking-tight group-hover:text-[var(--ui-text)] transition-colors">
                        {ch.name}
                      </p>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[var(--ui-text-secondary)] bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] px-2.5 py-0.5 rounded-full">
                        {ch.tag}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--ui-text-muted)] group-hover:text-[var(--ui-text-secondary)] truncate transition-colors">
                        {ch.description}
                    </p>
                  </div>
                  
                  <div className="relative hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300">
                      <ArrowRight className="h-5 w-5 text-[var(--ui-text-secondary)]" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <motion.h3 variants={itemVariants} className="text-xs font-bold uppercase tracking-widest text-[var(--ui-text-muted)] mb-4 pl-2">
            Quick Actions
          </motion.h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {quickLinks.map((action) => (
              <motion.div key={action.name} variants={itemVariants}>
                <Link
                  href={action.href}
                  className="flex flex-col items-center justify-center py-7 px-4 group rounded-[1.5rem] bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] hover:border-[var(--ui-accent)]/40 hover:bg-[var(--ui-bg-elevated)] transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1"
                >
                  <div className="h-14 w-14 rounded-2xl bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                    <action.icon className="h-6 w-6 text-[var(--ui-text-muted)] group-hover:text-[var(--ui-text)] transition-colors" />
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
