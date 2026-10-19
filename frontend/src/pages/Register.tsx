import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Factory, LockKeyhole, UserPlus } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import NexusBrand from '../components/NexusBrand';

const Register = () => {
    const navigate = useNavigate();
    const setCredentials = useAuthStore((state) => state.setCredentials);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        if (name.trim().length < 2) {
            setError('Enter a name with at least 2 characters.');
            return;
        }
        if (new TextEncoder().encode(password).length > 72) {
            setError('Password must not exceed 72 UTF-8 bytes.');
            return;
        }
        if (password.length < 12) {
            setError('Password must contain at least 12 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setSubmitting(true);
        try {
            // Never send a client-selected role: the API creates operators only.
            const response = await api.post('/auth/register', {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password,
            });
            setCredentials(response.data, response.data.token);
            navigate('/dashboard', { replace: true });
        } catch (caught: unknown) {
            const failure = caught as { response?: { data?: { message?: string } } };
            setError(failure.response?.data?.message || 'Registration failed. Please check your details and try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="nexus-auth flex items-center justify-center p-4 sm:p-8">
            <div className="nexus-auth-card w-full max-w-lg overflow-hidden rounded-2xl">
                <header className="nexus-auth-heading text-white p-7 sm:p-9">
                    <div className="mb-6"><NexusBrand /></div>
                    <div className="flex gap-3 items-center">
                        <div className="rounded-xl border border-white/20 bg-white/10 p-3"><Factory size={26} aria-hidden="true" /></div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-blue-100">NEXUS / PlantLog operator onboarding</p>
                            <h1 className="text-2xl font-bold mt-1">Create an operator account</h1>
                        </div>
                    </div>
                    <p className="mt-4 text-sm text-blue-50/90 leading-relaxed">
                        For the locally hosted application. New users receive the operator role;
                        administrative and supervisor permissions cannot be requested here.
                    </p>
                </header>

                <form onSubmit={handleSubmit} className="p-7 sm:p-9 space-y-5">
                    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
                    <div>
                        <label htmlFor="register-name" className="block text-sm font-semibold text-slate-700 mb-2">Full name</label>
                        <input id="register-name" required autoComplete="name" minLength={2} maxLength={100}
                            value={name} onChange={(event) => setName(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-600"
                            placeholder="Demo Operator" />
                    </div>
                    <div>
                        <label htmlFor="register-email" className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                        <input id="register-email" type="email" required autoComplete="email"
                            value={email} onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-600"
                            placeholder="operator@example.com" />
                    </div>
                    <div>
                        <label htmlFor="register-password" className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
                        <input id="register-password" type="password" required minLength={12} maxLength={72} autoComplete="new-password"
                            value={password} onChange={(event) => setPassword(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-600"
                            placeholder="At least 12 characters" />
                    </div>
                    <div>
                        <label htmlFor="register-confirm" className="block text-sm font-semibold text-slate-700 mb-2">Confirm password</label>
                        <input id="register-confirm" type="password" required minLength={12} maxLength={72} autoComplete="new-password"
                            value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-600"
                            placeholder="Repeat password" />
                    </div>
                    <div className="flex gap-2 items-start rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                        <LockKeyhole size={17} className="shrink-0 text-blue-700" aria-hidden="true" />
                        <p>This account can register equipment and log events. Only supervisors and administrators can edit equipment metadata or decommission assets.</p>
                    </div>
                    <button type="submit" disabled={submitting}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#096FAD] px-4 py-3 text-sm font-bold text-white hover:bg-[#075A8D] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-60">
                        <UserPlus size={18} aria-hidden="true" />{submitting ? 'Creating account…' : 'Create operator account'}
                    </button>
                    <p className="text-center text-sm text-slate-600">
                        Already registered? <Link to="/login" className="font-bold text-blue-700 hover:underline">Sign in</Link>
                        <span aria-hidden="true" className="mx-2">·</span>
                        <Link to="/demo" className="font-bold text-blue-700 hover:underline">Explore demo</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Register;
