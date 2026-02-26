'use client';

import { useState } from 'react';
import { useAuth } from '../../components/AuthProvider';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const { sendLoginLink } = useAuth();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        if (!email.endsWith('@dypatil.edu')) {
            toast.error('Only @dypatil.edu emails are allowed.');
            return;
        }

        setLoading(true);
        try {
            await sendLoginLink(email);
            setEmailSent(true);
            toast.success('Login link sent to your email!');
        } catch (error: any) {
            toast.error(error.message || 'Failed to send login link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-lg">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">DYPU Connect</h2>
                    <p className="mt-2 text-sm text-gray-600">Exclusive social platform for DY Patil University</p>
                </div>

                {emailSent ? (
                    <div className="rounded-md bg-green-50 p-4 mt-8">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-green-800">Check your email</h3>
                                <div className="mt-2 text-sm text-green-700">
                                    <p>We've sent a sign-in link to <strong>{email}</strong>.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                required
                                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Email address (@dypatil.edu)"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                            >
                                {loading ? 'Sending link...' : 'Sign in with Email'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
