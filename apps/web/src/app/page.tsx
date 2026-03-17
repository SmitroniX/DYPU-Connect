'use client';

import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { useStore } from '@/store/useStore';
import { Home, MessageSquare, Users, MessageCircle, Mail, User, Settings, ArrowRight } from 'lucide-react';
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
    { name: 'Confessions', description: 'Share secrets anonymously', icon: MessageSquare, href: '/confessions', tag: '50+' },
    { name: 'Public Chat', description: 'Campus-wide real-time chat', icon: Users, href: '/public-chat', tag: 'Live' },
    { name: 'Anonymous Chat', description: 'Speak freely in the shadows', icon: MessageCircle, href: '/anonymous-chat', tag: 'Anonymous' },
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

      <div className="p-4 sm:p-6 max-w-5xl mx-auto animate-[fade-in-up_0.3s_ease-out]">
        {/* Welcome */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[var(--ui-text)]">
            {getTimeGreeting()}, {userProfile?.name?.split(' ')[0]}!
          </h2>
          <p className="mt-1 text-sm text-[var(--ui-text-muted)]">
            {userProfile?.field} · {userProfile?.year} · {userProfile?.division} ({userProfile?.branch})
          </p>
        </div>

        {/* Channel Cards */}
        <div className="mb-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ui-text-muted)] mb-2 px-1">
            Chat Rooms
          </h3>
          <div className="space-y-1.5">
            {channels.map((ch) => (
              <Link
                key={ch.name}
                href={ch.href}
                className="surface-interactive flex items-center gap-3 px-4 py-3 group"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--ui-accent-dim)] shrink-0">
                  <ch.icon className="h-4.5 w-4.5 text-[var(--ui-accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--ui-text-secondary)] group-hover:text-[var(--ui-text)] truncate transition-colors">
                    {ch.name}
                  </p>
                  <p className="text-xs text-[var(--ui-text-muted)] truncate">{ch.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-medium text-[var(--ui-text-muted)] bg-[var(--ui-bg-elevated)] px-2 py-0.5 rounded-full">
                    {ch.tag}
                  </span>
                  <ArrowRight className="h-4 w-4 text-[var(--ui-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ui-text-muted)] mb-2 px-1">
            Quick Links
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {quickLinks.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className="surface-interactive flex flex-col items-center justify-center py-4 px-3 group"
              >
                <action.icon className="h-6 w-6 text-[var(--ui-text-muted)] group-hover:text-[var(--ui-accent)] mb-2 transition-colors" />
                <span className="text-sm font-medium text-[var(--ui-text-secondary)] group-hover:text-[var(--ui-text)] transition-colors">
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
