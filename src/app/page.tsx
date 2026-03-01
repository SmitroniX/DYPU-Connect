'use client';

import DashboardLayout from '@/components/DashboardLayout';
import ChannelHeader from '@/components/ChannelHeader';
import { useStore } from '@/store/useStore';
import { MessageSquare, Users, MessageCircle, Mail, User, Settings, ArrowRight, Hash } from 'lucide-react';
import Link from 'next/link';

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

export default function DashboardPage() {
  const { userProfile } = useStore();

  const channels = [
    { name: 'confessions', description: 'Share secrets anonymously', icon: MessageSquare, href: '/confessions', members: '50+' },
    { name: 'public-chat', description: 'Campus-wide real-time chat', icon: Users, href: '/public-chat', members: 'Live' },
    { name: 'anonymous-chat', description: 'Speak freely in the shadows', icon: MessageCircle, href: '/anonymous-chat', members: 'Anonymous' },
  ];

  const quickLinks = [
    { name: 'Groups', icon: Users, href: '/groups' },
    { name: 'Messages', icon: Mail, href: '/messages' },
    { name: 'Profile', icon: User, href: '/profile' },
    { name: 'Settings', icon: Settings, href: '/settings' },
  ];

  return (
    <DashboardLayout>
      <ChannelHeader name="home" description="Your dashboard" />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto animate-[fade-in-up_0.3s_ease-out]">
        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[var(--dc-text-primary)]">
            {getTimeGreeting()}, {userProfile?.name?.split(' ')[0]}!
          </h2>
          <p className="mt-1 text-sm text-[var(--dc-text-muted)]">
            {userProfile?.field} · {userProfile?.year} · {userProfile?.division} ({userProfile?.branch})
          </p>
        </div>

        {/* Channel Cards */}
        <div className="mb-6">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-[var(--dc-text-muted)] mb-2 px-1">
            Text Channels
          </h3>
          <div className="space-y-1">
            {channels.map((ch) => (
              <Link
                key={ch.name}
                href={ch.href}
                className="dc-card-interactive flex items-center gap-3 px-3 py-2.5 group"
              >
                <Hash className="h-5 w-5 text-[var(--dc-text-muted)] group-hover:text-[var(--dc-text-primary)] shrink-0 transition-colors" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-[var(--dc-text-secondary)] group-hover:text-[var(--dc-text-primary)] truncate transition-colors">
                    {ch.name}
                  </p>
                  <p className="text-xs text-[var(--dc-text-muted)] truncate">{ch.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-medium text-[var(--dc-text-muted)] bg-[var(--dc-bg-tertiary)] px-2 py-0.5 rounded-full">
                    {ch.members}
                  </span>
                  <ArrowRight className="h-4 w-4 text-[var(--dc-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-[var(--dc-text-muted)] mb-2 px-1">
            Quick Links
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickLinks.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className="dc-card-interactive flex flex-col items-center justify-center py-4 px-3 group"
              >
                <action.icon className="h-6 w-6 text-[var(--dc-text-muted)] group-hover:text-[var(--dc-accent)] mb-2 transition-colors" />
                <span className="text-sm font-medium text-[var(--dc-text-secondary)] group-hover:text-[var(--dc-text-primary)] transition-colors">
                  {action.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
