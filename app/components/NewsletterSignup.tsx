'use client';

import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

interface NewsletterSignupProps {
  className?: string;
  variant?: 'default' | 'minimal' | 'sidebar';
}

export default function NewsletterSignup({
  className = '',
  variant = 'default'
}: NewsletterSignupProps) {
  const { theme } = useTheme();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }

    setStatus('loading');

    try {
      // For now, we'll simulate an API call
      // In a real implementation, you would send this to your newsletter service
      // like Mailchimp, ConvertKit, or a custom backend

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

      // Store the email locally for now (in real app, send to service)
      const subscribers = JSON.parse(localStorage.getItem('newsletter_subscribers') || '[]');

      if (subscribers.includes(email)) {
        setStatus('error');
        setMessage('This email is already subscribed!');
        return;
      }

      subscribers.push(email);
      localStorage.setItem('newsletter_subscribers', JSON.stringify(subscribers));

      setStatus('success');
      setMessage('Thanks for subscribing! You\'ll receive updates about new posts.');
      setEmail('');

      // Reset status after 5 seconds
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 5000);

    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again later.');
    }
  };

  if (variant === 'minimal') {
    return (
      <div className={`${className}`}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className={`flex-1 px-3 py-2 text-sm rounded-md border transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-black/30 border-white/20 text-white placeholder-white/60 focus:border-white/40'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-400'
            }`}
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {status === 'loading' ? '...' : 'Subscribe'}
          </button>
        </form>

        {message && (
          <p className={`text-xs mt-2 ${
            status === 'success'
              ? 'text-green-600'
              : status === 'error'
                ? 'text-red-600'
                : theme === 'dark' ? 'text-white/70' : 'text-gray-600'
          }`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={`${className} p-4 rounded-lg border ${
        theme === 'dark'
          ? 'bg-white/5 border-white/10'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <h3 className={`text-sm font-semibold mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          📧 Stay Updated
        </h3>

        <p className={`text-xs mb-3 ${
          theme === 'dark' ? 'text-white/70' : 'text-gray-600'
        }`}>
          Get notified when I publish new posts about data science, programming, and technology.
        </p>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className={`w-full px-3 py-2 text-sm rounded-md border transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-black/30 border-white/20 text-white placeholder-white/60 focus:border-white/40'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-400'
            }`}
            disabled={status === 'loading'}
          />

          <button
            type="submit"
            disabled={status === 'loading'}
            className={`w-full px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>

        {message && (
          <p className={`text-xs mt-2 ${
            status === 'success'
              ? 'text-green-600'
              : status === 'error'
                ? 'text-red-600'
                : theme === 'dark' ? 'text-white/70' : 'text-gray-600'
          }`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={`relative overflow-hidden rounded-xl p-6 ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-white/10'
        : 'bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200'
    } ${className}`}>

      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            theme === 'dark' ? 'bg-white/10' : 'bg-white/50'
          }`}>
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <div>
            <h3 className={`font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Subscribe to the Newsletter
            </h3>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-white/70' : 'text-gray-600'
            }`}>
              Get the latest posts delivered right to your inbox
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            className={`flex-1 px-4 py-3 rounded-lg border transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-black/30 border-white/20 text-white placeholder-white/60 focus:border-white/40 focus:bg-black/40'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-400 focus:shadow-sm'
            }`}
            disabled={status === 'loading'}
          />

          <button
            type="submit"
            disabled={status === 'loading'}
            className={`px-6 py-3 font-medium rounded-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-900/25'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/25'
            }`}
          >
            {status === 'loading' ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Subscribing...</span>
              </div>
            ) : (
              'Subscribe'
            )}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded-lg ${
            status === 'success'
              ? theme === 'dark'
                ? 'bg-green-900/20 border border-green-500/30 text-green-400'
                : 'bg-green-50 border border-green-200 text-green-700'
              : status === 'error'
                ? theme === 'dark'
                  ? 'bg-red-900/20 border border-red-500/30 text-red-400'
                  : 'bg-red-50 border border-red-200 text-red-700'
                : theme === 'dark' ? 'text-white/70' : 'text-gray-600'
          }`}>
            <p className="text-sm">{message}</p>
          </div>
        )}

        <p className={`text-xs mt-3 ${
          theme === 'dark' ? 'text-white/50' : 'text-gray-500'
        }`}>
          No spam, ever. Unsubscribe at any time. I respect your privacy.
        </p>
      </div>
    </div>
  );
}