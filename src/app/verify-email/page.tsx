'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function VerifyEmailPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { verifyLoginLink } = useAuth();
    const router = useRouter();
    const mounted = useRef(false);

    useEffect(() => {
        if (mounted.current) return;
        mounted.current = true;

        const verifyLink = async () => {
            let email = window.localStorage.getItem('emailForSignIn');

            if (!email) {
                email = window.prompt('Please verify your email (@dypatil.edu) for confirmation');
            }

            if (!email || !email.endsWith('@dypatil.edu')) {
                setError('Valid @dypatil.edu email is required for sign-in.');
                setLoading(false);
                return;
            }

            try {
                await verifyLoginLink(email, window.location.href);
                toast.success('Successfully signed in!');
                router.push('/');
            } catch (err: any) {
                setError(err.message || 'Failed to verify login link.');
            } finally {
                setLoading(false);
            }
        };

        verifyLink();
    }, [verifyLoginLink, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-2xl shadow-lg text-center">
                {loading ? (
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Verifying your login...</h2>
                        <div className="mt-4 flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    </div>
                ) : error ? (
                    <div>
                        <h2 className="text-xl font-bold text-red-600">Verification Failed</h2>
                        <p className="mt-2 text-sm text-gray-600">{error}</p>
                        <button
                            onClick={() => router.push('/login')}
                            className="mt-6 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Back to Login
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
