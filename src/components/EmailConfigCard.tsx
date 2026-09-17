'use client';

import { useState, useEffect } from 'react';
import { Mail, CheckCircle2, RefreshCw, ShieldCheck, Lock, AtSign, AlertCircle, XCircle } from 'lucide-react';
import { disconnectGoogleEmailAction, getEmailConfigAction } from '@/app/actions/email-notification';
import GoogleOAuthModal from '@/components/GoogleOAuthModal';

type AuthStatus = 'ACTIVE' | 'DISCONNECTED' | 'AUTH_FAILED' | 'RECONNECT_REQUIRED';

function oauthErrorMessage(code?: string | null) {
  switch (code) {
    case 'missing_config':
      return 'Google OAuth belum dikonfigurasi. Tambahkan GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET, lalu restart app.';
    case 'redirect_uri_mismatch':
      return 'Redirect URI Google OAuth belum cocok. Tambahkan callback URL app ini di Google Cloud Console.';
    case 'access_denied':
      return 'Google authorization dibatalkan. Klik Reconnect Google untuk mencoba lagi.';
    case 'invalid_state':
      return 'Sesi login Google kedaluwarsa. Klik Reconnect Google untuk memulai ulang.';
    case 'invalid_grant':
      return 'Akses Google sudah expired atau dicabut. Reconnect Google untuk melanjutkan sync.';
    default:
      return 'Google authentication gagal. Periksa konfigurasi OAuth lalu coba lagi.';
  }
}

export default function EmailConfigCard() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('email@google.com');
  const [authStatus, setAuthStatus] = useState<AuthStatus>('DISCONNECTED');
  const [lastAuthError, setLastAuthError] = useState<string | null>(null);
  const [googleOAuthConfigured, setGoogleOAuthConfigured] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const loadConfig = async () => {
    try {
      const res = await getEmailConfigAction();
      if (res.config) {
        setEmail(res.config.email || 'email@google.com');
        setAuthStatus((res.config.authStatus || (res.config.encryptedOAuthToken ? 'ACTIVE' : 'DISCONNECTED')) as AuthStatus);
        setLastAuthError(res.config.lastAuthError || null);
      }
      setGoogleOAuthConfigured(Boolean(res.googleOAuthConfigured));
    } catch (err: any) {
      console.error('Failed to load email config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    const params = new URLSearchParams(window.location.search);
    const googleAuth = params.get('google_auth');
    const error = params.get('error');
    if (googleAuth === 'success') {
      setFeedback({ success: true, message: 'Google account connected and verified.' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (googleAuth === 'error') {
      setFeedback({ success: false, message: oauthErrorMessage(error) });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleOAuthStart = (hintEmail?: string) => {
    if (hintEmail) setEmail(hintEmail);
    setFeedback({
      success: true,
      message: hintEmail ? `Opening Google authentication for ${hintEmail}...` : 'Opening Google account chooser...',
    });
  };

  const handleOpenOAuth = () => {
    if (!googleOAuthConfigured) {
      setFeedback({
        success: false,
        message: 'Google OAuth belum dikonfigurasi. Tambahkan GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di .env, daftarkan callback URL di Google Cloud, lalu restart app.',
      });
      return;
    }
    setShowModal(true);
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Account? Email sync will stop, but existing Canva notifications will remain.')) return;
    setDisconnecting(true);
    const res = await disconnectGoogleEmailAction();
    if (res.success) {
      setAuthStatus('DISCONNECTED');
      setLastAuthError(null);
      setFeedback({ success: true, message: 'Google account disconnected. Existing email notifications were kept.' });
    } else {
      setFeedback({ success: false, message: res.error || 'Failed to disconnect Google account.' });
    }
    setDisconnecting(false);
  };

  const isActive = authStatus === 'ACTIVE';
  const isDisconnected = authStatus === 'DISCONNECTED';
  const statusView = isActive
    ? { label: 'Active & Verified', icon: CheckCircle2, className: 'bg-[rgba(0,153,102,0.1)] border-[#096] text-[#096]' }
    : authStatus === 'RECONNECT_REQUIRED'
      ? { label: 'Reconnect Required', icon: AlertCircle, className: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' }
      : authStatus === 'AUTH_FAILED'
        ? { label: 'Authentication Failed', icon: XCircle, className: 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' }
        : { label: 'Not Connected', icon: AlertCircle, className: 'bg-gray-500/10 border-gray-500/20 text-gray-600 dark:text-gray-400' };
  const StatusIcon = statusView.icon;

  if (loading) {
    return (
      <div className="p-6 border-t border-[#eee] dark:border-[#272a34] flex items-center justify-center gap-2 text-xs font-sans text-gray-500">
        <RefreshCw className="w-4 h-4 animate-spin text-[#ff5e1f]" /> Loading configuration...
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col font-sans bg-white dark:bg-[#0d0e12]">
      {/* Header Bar matching Figma Node 474:22 */}
      <div className="w-full bg-white dark:bg-[#0d0e12] flex items-center justify-between p-4 border-b border-[#f0f0f0] dark:border-[#272a34] gap-4">
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-2">
          <Mail className="w-6 h-6 text-gray-900 dark:text-white shrink-0" />
          <h3 className="text-[16px] font-semibold font-sans text-gray-900 dark:text-white whitespace-nowrap">
            Canva Email Notification
          </h3>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenOAuth}
            disabled={!googleOAuthConfigured}
            className="bg-white dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] flex items-center gap-2 px-3 py-2.5 rounded-[8px] hover:bg-gray-50 dark:hover:bg-[#16181d]/80 transition-colors cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock className="w-[18px] h-[18px] text-[#ff5e1f] shrink-0" />
            <span className="text-sm font-sans font-medium text-[#ff5e1f] whitespace-nowrap">
              {isActive ? 'Reconnect Gmail' : isDisconnected ? 'Connect Gmail' : 'Reconnect Google'}
            </span>
          </button>

          {!isDisconnected && (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="bg-white dark:bg-[#16181d] border border-rose-500/20 flex items-center gap-2 px-3 py-2.5 rounded-[8px] hover:bg-rose-500/5 transition-colors cursor-pointer shrink-0 disabled:opacity-60"
            >
              {disconnecting ? <RefreshCw className="w-[18px] h-[18px] text-rose-500 animate-spin shrink-0" /> : <XCircle className="w-[18px] h-[18px] text-rose-500 shrink-0" />}
              <span className="text-sm font-sans font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">
                Disconnect
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Body Card Section matching Figma Node 474:69 */}
      <div className="w-full p-4">
        <div className="w-full bg-[#fcfdfd] dark:bg-[#16181d] border border-[#f0f0f0] dark:border-[#272a34] rounded-[12px] p-3 flex flex-col gap-0 divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
          {/* Row 1: Email Account */}
          <div className="w-full py-2.5 flex items-center justify-between gap-4">
            <span className="text-[11px] font-sans font-medium opacity-50 text-gray-900 dark:text-white whitespace-nowrap">
              Email Account
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <AtSign className="w-4 h-4 text-gray-800 dark:text-gray-200" />
              <span className="text-xs font-sans font-medium text-gray-900 dark:text-white whitespace-nowrap">
                {isDisconnected ? 'Belum terhubung' : email}
              </span>
            </div>
          </div>

          {/* Row 2: Authentication Protocol */}
          <div className="w-full py-2.5 flex items-center justify-between gap-4">
            <span className="text-[11px] font-sans font-medium opacity-50 text-gray-900 dark:text-white whitespace-nowrap">
              Authentication Protocol
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <ShieldCheck className="w-4 h-4 text-gray-800 dark:text-gray-200" />
              <span className="text-xs font-sans font-medium text-gray-900 dark:text-white whitespace-nowrap">
                Google OAuth2
              </span>
            </div>
          </div>

          {/* Row 3: Security Status */}
          <div className="w-full py-2.5 flex items-center justify-between gap-4">
            <span className="text-[11px] font-sans font-medium opacity-50 text-gray-900 dark:text-white whitespace-nowrap">
              Security Status
            </span>
            <div className={`${statusView.className} border flex items-center gap-1 px-2 py-1 rounded-[80px] shrink-0`}>
              <StatusIcon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-sans font-medium whitespace-nowrap">
                {statusView.label}
              </span>
            </div>
          </div>
        </div>

        {lastAuthError && !isActive && (
          <div className="mt-3 p-3 rounded-lg border text-xs font-sans flex items-center gap-2 bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{lastAuthError}</span>
          </div>
        )}

        {feedback && (
          <div
            className={`mt-3 p-3 rounded-lg border text-xs font-sans flex items-center gap-2 ${
              feedback.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            {feedback.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
        )}

        {!googleOAuthConfigured && (
          <div className="mt-3 p-3 rounded-lg border text-xs font-sans bg-gray-50 dark:bg-[#16181d] border-[#f0f0f0] dark:border-[#272a34] text-gray-600 dark:text-gray-300">
            <div className="font-bold text-gray-900 dark:text-white mb-1">Google OAuth Setup Required</div>
            <div>Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `EMAIL_TOKEN_SECRET`, lalu daftarkan callback URL: `/api/google/oauth/callback`.</div>
          </div>
        )}
      </div>

      {/* Google OAuth Modal Trigger */}
      <GoogleOAuthModal
        open={showModal}
        onClose={() => setShowModal(false)}
        currentEmail={email}
        onStart={handleOAuthStart}
      />
    </div>
  );
}
