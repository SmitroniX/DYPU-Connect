'use client';

import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store/useStore';
import { Home, MessageSquare, Users, MessageCircle, Mail, User, Settings, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 22) return 'Good evening';
  return 'Good night';
}

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5 } }
};

export default function DashboardPage() {
  const { userProfile } = useStore();

  return (
    <DashboardLayout>
      <PageHeader title="Overview" description="Campus at a glance" icon={<Home className="h-4.5 w-4.5" />} />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="p-4 sm:p-6 max-w-5xl mx-auto"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 auto-rows-fr">
          
          {/* Welcome Banner - Span full width on mobile, 2 columns on desktop */}
          <motion.div variants={itemVariants} className="md:col-span-2 relative overflow-hidden rounded-[32px] p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-900/20 group flex flex-col justify-between min-h-[220px]">
            <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity duration-700">
              <Sparkles className="w-32 h-32 text-white rotate-12" />
            </div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 flex-1">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
                {getTimeGreeting()},
                <br />
                {userProfile?.name?.split(' ')[0]}!
              </h2>
              <p className="text-blue-100 font-medium max-w-sm">
                Ready to connect with your campus? Check out the latest discussions or share a confession.
              </p>
            </div>

            <div className="relative z-10 mt-6 flex flex-wrap gap-2">
                {userProfile?.field && (
                    <span className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-white border border-white/30">
                        {userProfile.field}
                    </span>
                )}
                {userProfile?.year && (
                    <span className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-white border border-white/30">
                        {userProfile.year}
                    </span>
                )}
                {userProfile?.division && (
                    <span className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-white border border-white/30">
                        Div {userProfile.division}
                    </span>
                )}
            </div>
          </motion.div>

          {/* Featured: Confessions (Square card) */}
          <motion.div variants={itemVariants}>
            <Link href="/confessions" className="block h-full relative overflow-hidden rounded-[32px] p-8 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl shadow-orange-900/20 group hover:-translate-y-1 transition-transform duration-300">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-2xl group-hover:bg-white/30 transition-colors" />
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 border border-white/30">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2">Confessions</h3>
              <p className="text-orange-100 text-sm font-medium">Share your campus secrets completely anonymously.</p>
              
              <div className="absolute bottom-6 right-6 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center -rotate-45 group-hover:rotate-0 transition-transform duration-500 border border-white/30">
                <ArrowRight className="h-5 w-5 text-white" />
              </div>
            </Link>
          </motion.div>

          {/* Featured: Public Chat */}
          <motion.div variants={itemVariants}>
            <Link href="/public-chat" className="block h-full relative overflow-hidden rounded-[32px] p-8 bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-xl shadow-purple-900/20 group hover:-translate-y-1 transition-transform duration-300">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 border border-white/30">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2">Public Chat</h3>
              <p className="text-purple-100 text-sm font-medium">Join the campus-wide real-time discussion.</p>
              <div className="absolute bottom-6 right-6 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center -rotate-45 group-hover:rotate-0 transition-transform duration-500 border border-white/30">
                <ArrowRight className="h-5 w-5 text-white" />
              </div>
            </Link>
          </motion.div>

          {/* Featured: Anonymous Chat */}
          <motion.div variants={itemVariants}>
            <Link href="/anonymous-chat" className="block h-full relative overflow-hidden rounded-[32px] p-8 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-900/20 group hover:-translate-y-1 transition-transform duration-300">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 border border-white/30">
                <MessageCircle className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-2">Anon Chat</h3>
              <p className="text-emerald-100 text-sm font-medium">Speak freely in the shadows with auto-generated names.</p>
              <div className="absolute bottom-6 right-6 h-10 w-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center -rotate-45 group-hover:rotate-0 transition-transform duration-500 border border-white/30">
                <ArrowRight className="h-5 w-5 text-white" />
              </div>
            </Link>
          </motion.div>

          {/* Quick Action Grid */}
          <motion.div variants={itemVariants} className="md:col-span-1 grid grid-cols-2 gap-4">
            <Link href="/messages" className="flex flex-col items-center justify-center p-6 rounded-[32px] glass-panel bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-elevated)] transition-colors shadow-sm group">
              <div className="h-12 w-12 rounded-full bg-[var(--ui-accent-dim)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Mail className="h-5 w-5 text-[var(--ui-accent)]" />
              </div>
              <span className="text-sm font-bold text-[var(--ui-text)]">Inbox</span>
            </Link>
            
            <Link href="/groups" className="flex flex-col items-center justify-center p-6 rounded-[32px] glass-panel bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-elevated)] transition-colors shadow-sm group">
              <div className="h-12 w-12 rounded-full bg-[var(--ui-accent-dim)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-[var(--ui-accent)]" />
              </div>
              <span className="text-sm font-bold text-[var(--ui-text)]">Groups</span>
            </Link>

            <Link href="/profile" className="flex flex-col items-center justify-center p-6 rounded-[32px] glass-panel bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-elevated)] transition-colors shadow-sm group">
              <div className="h-12 w-12 rounded-full bg-[var(--ui-accent-dim)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <User className="h-5 w-5 text-[var(--ui-accent)]" />
              </div>
              <span className="text-sm font-bold text-[var(--ui-text)]">Profile</span>
            </Link>

            <Link href="/settings" className="flex flex-col items-center justify-center p-6 rounded-[32px] glass-panel bg-[var(--ui-bg-surface)] border border-[var(--ui-border)] hover:bg-[var(--ui-bg-elevated)] transition-colors shadow-sm group">
              <div className="h-12 w-12 rounded-full bg-[var(--ui-accent-dim)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Settings className="h-5 w-5 text-[var(--ui-accent)]" />
              </div>
              <span className="text-sm font-bold text-[var(--ui-text)]">Settings</span>
            </Link>
          </motion.div>

        </div>
      </motion.div>
    </DashboardLayout>
  );
}
