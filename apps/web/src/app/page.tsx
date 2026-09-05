'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { 
    MessageSquare, Users, MessageCircle, 
    Mail, User, Settings, Sparkles,
    ArrowUpRight
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
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0, scale: 0.95 },
  visible: { y: 0, opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] } }
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
        color: 'text-amber-400',
        glow: 'shadow-[0_0_20px_rgba(251,191,36,0.15)]'
    },
    { 
        id: 'public',
        name: 'Public Chat', 
        description: 'Join the campus-wide real-time discussion', 
        icon: Users, 
        href: '/public-chat', 
        tag: 'Live', 
        color: 'text-blue-400',
        glow: 'shadow-[0_0_20px_rgba(96,165,250,0.15)]'
    },
    { 
        id: 'anon',
        name: 'Anonymous Chat', 
        description: 'Speak freely in the shadows', 
        icon: MessageCircle, 
        href: '/anonymous-chat', 
        tag: 'Secure', 
        color: 'text-emerald-400',
        glow: 'shadow-[0_0_20px_rgba(52,211,153,0.15)]'
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
      {/* Liquid Glass Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] mix-blend-screen animate-[pulse_10s_infinite_alternate]" />
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] mix-blend-screen animate-[pulse_12s_infinite_alternate-reverse]" />
        <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-emerald-500/15 rounded-full blur-[80px] mix-blend-screen animate-[pulse_8s_infinite_alternate]" />
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-8 min-h-[calc(100vh-4rem)] flex flex-col justify-center pb-20">
          
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
        >
            {/* Header Section */}
            <motion.div variants={itemVariants} className="liquid-glass p-8 sm:p-10 text-center sm:text-left relative">
                <div className="absolute top-0 right-0 p-8 opacity-20 hidden sm:block">
                    <Sparkles className="w-24 h-24 text-white rotate-12" />
                </div>
                
                <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
                    {getTimeGreeting()}, <br className="sm:hidden" />
                    <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">{userProfile?.name?.split(' ')[0]}</span>.
                </h1>
                
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mt-6">
                    {userProfile?.field && (
                        <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md shadow-inner">
                            {userProfile.field}
                        </div>
                    )}
                    {userProfile?.year && (
                        <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md shadow-inner">
                            {userProfile.year}
                        </div>
                    )}
                    {userProfile?.division && (
                        <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md shadow-inner">
                            Div {userProfile.division}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Main Spaces */}
            <motion.div variants={itemVariants}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                    {channels.map((ch) => (
                        <Link 
                            key={ch.id} 
                            href={ch.href}
                            className={`liquid-glass-interactive p-6 flex flex-col items-start gap-4 group ${ch.glow}`}
                        >
                            <div className="w-full flex justify-between items-start">
                                <div className={`flex items-center justify-center h-14 w-14 rounded-2xl bg-white/10 border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-500 ${ch.color}`}>
                                    <ch.icon className="h-7 w-7" />
                                </div>
                                <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 opacity-50 group-hover:opacity-100 group-hover:bg-white/10 transition-all duration-300">
                                    <ArrowUpRight className="h-4 w-4 text-white" />
                                </div>
                            </div>
                            
                            <div className="mt-2">
                                <h3 className="text-xl font-bold text-white mb-1">
                                    {ch.name}
                                </h3>
                                <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors line-clamp-2">
                                    {ch.description}
                                </p>
                            </div>
                            
                            <div className="mt-auto pt-4">
                                <span className={`text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full bg-white/10 border border-white/20 ${ch.color}`}>
                                    {ch.tag}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </motion.div>

            {/* Quick Links */}
            <motion.div variants={itemVariants}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {quickLinks.map((link) => (
                        <Link 
                            key={link.name} 
                            href={link.href}
                            className="liquid-glass-interactive p-5 flex items-center justify-center gap-3 group"
                        >
                            <div className="p-2 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/20 group-hover:border-white/30 transition-colors">
                                <link.icon className="h-5 w-5 text-white/70 group-hover:text-white transition-colors" />
                            </div>
                            <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">
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
