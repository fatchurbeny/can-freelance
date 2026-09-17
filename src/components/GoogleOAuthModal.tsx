'use client';

import { useState } from 'react';
import { Lock, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, X, Mail } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  currentEmail: string;
  onStart: (hintEmail?: string) => void;
}

export default function GoogleOAuthModal({ open, onClose, currentEmail, onStart }: Props) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!open) return null;

  const hintEmail = currentEmail && currentEmail !== 'email@google.com' ? currentEmail : '';

  const handleTriggerOAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsAuthenticating(true);
    setFeedback(null);

    try {
      const query = hintEmail ? `?email=${encodeURIComponent(hintEmail)}` : '';
      onStart(hintEmail || undefined);
      window.open(`/api/google/oauth/start${query}`, '_blank', 'noopener,noreferrer');
      onClose();
    } catch (err: any) {
      setFeedback({
        success: false,
        message: err.message || 'Error redirecting to Google Authenticator.',
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0d0e12] border border-[#f0f0f0] dark:border-[#272a34] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ff5e1f]/10 text-[#ff5e1f] border border-[#ff5e1f]/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Connect Gmail Account</h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Google OAuth2 protected connection</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleTriggerOAuth} className="p-6 space-y-4 text-xs font-sans">
          {/* Security Banner */}
          <div className="p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-start gap-3">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px] leading-relaxed">
              <span className="font-bold block">2-Step Verification (2FA) Security Standard</span>
              <span>
                You will be redirected to Google to approve read-only Gmail access. No raw passwords or 2FA codes are stored in this app.
              </span>
            </div>
          </div>

          {/* Suggested Account */}
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="w-3.5 h-3.5 text-[#ff5e1f]" />
              <span className="text-xs font-sans font-bold text-gray-700 dark:text-gray-300">
                Suggested Account
              </span>
            </div>
            <span className="text-xs font-sans font-medium text-gray-900 dark:text-white truncate">
              {hintEmail || 'Choose on Google'}
            </span>
          </div>

          {feedback && (
            <div
              className={`p-3 rounded-lg border text-xs font-sans flex items-center gap-2 ${
                feedback.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
              }`}
            >
              {feedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#f0f0f0] dark:border-[#272a34]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-sans text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAuthenticating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-sans font-bold text-white bg-[#ff5e1f] hover:bg-[#ff7038] rounded-lg transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isAuthenticating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>{isAuthenticating ? 'Opening Google...' : 'Continue with Google'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
