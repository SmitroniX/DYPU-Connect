'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { MessageSquare, Users, MessageCircle, Mail, User, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';

function getTimeEmoji() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return '☀️';
  if (h >= 12 && h < 17) return '🌤️';
  if (h >= 17 && h < 21) return '🌙';
  return '🌜';
}

export default function DashboardPage() {
  const { userProfile } = useStore();

  const stats = [
    { name: 'Confessions', stat: 'Share secrets', icon: MessageSquare, href: '/confessions', gradient: 'from-pink-500/20 to-rose-500/20', iconColor: 'text-pink-400', borderHover: 'hover:border-pink-500/30' },
    { name: 'Public Chat', stat: 'Join the buzz', icon: Users, href: '/public-chat', gradient: 'from-amber-500/20 to-orange-500/20', iconColor: 'text-amber-400', borderHover: 'hover:border-amber-500/30' },
    { name: 'Anonymous Chat', stat: 'Speak freely', icon: MessageCircle, href: '/anonymous-chat', gradient: 'from-sky-500/20 to-slate-500/20', iconColor: 'text-sky-300', borderHover: 'hover:border-sky-400/30' },
  ];

  const quickActions = [
    { name: 'Groups', icon: Users, href: '/groups', color: 'text-emerald-400' },
    { name: 'Messages', icon: Mail, href: '/messages', color: 'text-sky-400' },
    { name: 'Profile', icon: User, href: '/profile', color: 'text-sky-300' },
    { name: 'Settings', icon: Settings, href: '/settings', color: 'text-slate-400' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-4 animate-[fade-in-up_0.5s_ease-out]">
        {/* Hero Greeting */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Welcome back, {userProfile?.name?.split(' ')[0]} {getTimeEmoji()}
          </h1>
          <p className="mt-3 text-base text-slate-400">
            {userProfile?.field} • {userProfile?.year} • {userProfile?.division} ({userProfile?.branch})
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {stats.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`group relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 ${item.borderHover} hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 p-6`}
            >
              <div className={`absolute inset-0 bg-linear-to-br ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <item.icon className={`h-6 w-6 ${item.iconColor}`} aria-hidden="true" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{item.name}</h3>
                <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">{item.stat}</p>
              </div>
              <div className="relative z-10 mt-6 pt-4 border-t border-white/10">
                <span className="text-sm font-medium text-sky-300 group-hover:text-sky-200 flex items-center gap-1.5 transition-colors">
                  <Sparkles className="w-3.5 h-3.5" />
                  Explore
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className="glass group flex flex-col items-center justify-center py-6 px-4 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                <action.icon className={`h-7 w-7 ${action.color} mb-3 group-hover:scale-110 transition-transform duration-200`} />
                <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{action.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
