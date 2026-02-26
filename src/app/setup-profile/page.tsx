'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { useStore } from '../../store/useStore';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

export default function SetupProfilePage() {
    const { user } = useAuth();
    const { userProfile, setUserProfile } = useStore();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: user?.displayName || '',
        field: 'Engineering',
        year: 'First Year',
        division: 'A',
        branch: 'Computer Engineering'
    });

    const fields = ['Engineering', 'MBBS', 'MBA', 'Law', 'Pharmacy', 'Ayurvedic'];
    const years = ['First Year', 'Second Year', 'Third Year', 'Fourth Year'];
    const divisions = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)); // A to Z

    useEffect(() => {
        if (!user) {
            router.replace('/login');
        } else if (userProfile) {
            router.replace('/');
        }
    }, [user, userProfile, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const newProfile = {
                userId: user.uid,
                name: formData.name,
                email: user.email as string,
                profileImage: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random`,
                field: formData.field,
                year: formData.year,
                division: formData.division,
                branch: formData.branch,
                role: 'user' as const,
                status: 'active' as const,
                createdAt: Date.now()
            };

            // Create user profile document
            await setDoc(doc(db, 'users', user.uid), newProfile);

            // Auto-assign to groups: Field, Field-Year, Field-Year-Division
            // (The actual group creation logic can be done via Firebase Cloud Functions or client-side.
            //  Here we'll have a simplified client-side tracking or just query-based groups).
            // We will handle specific Group Document population later.

            setUserProfile(newProfile);
            toast.success('Profile setup complete!');
            router.push('/');
        } catch (error: any) {
            toast.error(error.message || 'Failed to create profile');
        } finally {
            setLoading(false);
        }
    };

    if (!user || userProfile) return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">Complete Your Profile</h2>
                    <p className="mt-2 text-center text-sm text-gray-600">Setup your DYPU Connect identity</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input
                                id="name"
                                required
                                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label htmlFor="field" className="block text-sm font-medium text-gray-700">Field of Study</label>
                            <select
                                id="field"
                                className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={formData.field}
                                onChange={(e) => setFormData({ ...formData, field: e.target.value })}
                            >
                                {fields.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="branch" className="block text-sm font-medium text-gray-700">Branch Specialization</label>
                            <input
                                id="branch"
                                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="e.g. Computer, Mechanical"
                                value={formData.branch}
                                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label htmlFor="year" className="block text-sm font-medium text-gray-700">Year</label>
                                <select
                                    id="year"
                                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    value={formData.year}
                                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                >
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div className="w-1/3">
                                <label htmlFor="division" className="block text-sm font-medium text-gray-700">Division</label>
                                <select
                                    id="division"
                                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    value={formData.division}
                                    onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                                >
                                    {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                        >
                            {loading ? 'Saving...' : 'Complete Profile'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
