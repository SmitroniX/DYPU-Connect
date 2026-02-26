'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useStore } from '@/store/useStore';
import { MessageSquare, Users, MessageCircle } from 'lucide-react';

export default function DashboardPage() {
  const { userProfile } = useStore();

  const stats = [
    { name: 'Confessions', stat: 'View latest', icon: MessageSquare, href: '/confessions', color: 'bg-pink-100 text-pink-600' },
    { name: 'Public Chat', stat: 'Join discussion', icon: Users, href: '/public-chat', color: 'bg-blue-100 text-blue-600' },
    { name: 'Anonymous Chat', stat: 'Speak freely', icon: MessageCircle, href: '/anonymous-chat', color: 'bg-purple-100 text-purple-600' },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto py-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Welcome back, {userProfile?.name?.split(' ')[0]} 👋
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {userProfile?.field} • {userProfile?.year} • {userProfile?.division} ({userProfile?.branch})
        </p>

        <div className="mt-8">
          <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="relative overflow-hidden rounded-xl bg-white px-4 pb-12 pt-5 shadow sm:px-6 sm:pt-6 hover:shadow-md transition-shadow cursor-pointer border border-gray-100 group"
              >
                <dt>
                  <div className={`absolute rounded-md p-3 ${item.color} group-hover:scale-110 transition-transform duration-200`}>
                    <item.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 truncate text-sm font-medium text-gray-500">{item.name}</p>
                </dt>
                <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
                  <p className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">{item.stat}</p>
                  <div className="absolute inset-x-0 bottom-0 bg-gray-50 px-4 py-4 sm:px-6">
                    <div className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                      View all<span className="sr-only"> {item.name} stats</span>
                    </div>
                  </div>
                </dd>
              </a>
            ))}
          </dl>
        </div>
      </div>
    </DashboardLayout>
  );
}
