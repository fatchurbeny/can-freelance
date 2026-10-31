'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, RefreshCw, Lock, AlertCircle, XCircle, AlertTriangle } from 'lucide-react';
import { disconnectGoogleEmailAction, getEmailConfigAction } from '@/app/actions/email-notification';
import GoogleOAuthModal from '@/components/GoogleOAuthModal';
import { BTN, BTN_DANGER, BTN_PRIMARY, DOT, KV_GRID, KV_LABEL, KV_ROW, KV_VALUE, PANEL_HEAD, PANEL_TITLE } from '@/components/notion-config/styles';

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

/** Tab Email Notifikasi di Notion Config. `onStatusChange(true)` = koneksi Google perlu perhatian (badge tab). */
export default function EmailConfigCard({ onStatusChange }: { onStatusChange?: (needsAttention: boolean) => void } = {}) {
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
        const status = (res.config.authStatus || (res.config.encryptedOAuthToken ? 'ACTIVE' : 'DISCONNECTED')) as AuthStatus;
        setAuthStatus(status);
        onStatusChange?.(status === 'RECONNECT_REQUIRED' || status === 'AUTH_FAILED');
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
      window.history.replaceState(window.history.state, '', `${window.location.pathname}?tab=email`);
    } else if (googleAuth === 'error') {
      setFeedback({ success: false, message: oauthErrorMessage(error) });
      window.history.replaceState(window.history.state, '', `${window.location.pathname}?tab=email`);
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
      onStatusChange?.(false);
      setFeedback({ success: true, message: 'Google account disconnected. Existing email notifications were kept.' });
    } else {
      setFeedback({ success: false, message: res.error || 'Failed to disconnect Google account.' });
    }
    setDisconnecting(false);
  };

  const isActive = authStatus === 'ACTIVE';
  const isDisconnected = authStatus === 'DISCONNECTED';
  const needsAttention = authStatus === 'RECONNECT_REQUIRED' || authStatus === 'AUTH_FAILED';
  const statusView = isActive
    ? { label: 'Aktif & terverifikasi', dot: 'bg-[#00a67d]', text: 'text-emerald-700 dark:text-emerald-400' }
    : authStatus === 'RECONNECT_REQUIRED'
      ? { label: 'Perlu dihubungkan ulang', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400' }
      : authStatus === 'AUTH_FAILED'
        ? { label: 'Autentikasi gagal', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400' }
        : { label: 'Belum terhubung', dot: 'bg-[#6e7687]', text: 'text-gray-600 dark:text-gray-300' };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-xs text-gray-500">
        <RefreshCw className="h-4 w-4 animate-spin text-[#ff5e1f]" /> Memuat konfigurasi email…
      </div>
    );
  }

  return (
    <div className="flex flex-col font-sans">
      {needsAttention && (
        <div className="flex gap-2.5 border-b border-rose-200 bg-rose-50 px-5 py-3 text-xs leading-relaxed text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span><strong>Perlu dihubungkan ulang.</strong> {lastAuthError || 'Token Google sudah kedaluwarsa atau dicabut, notifikasi email Canva tidak terbaca.'}</span>
        </div>
      )}

      <div className={PANEL_HEAD}>
        <span className={PANEL_TITLE}>Canva Email Notification</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleOpenOAuth} disabled={!googleOAuthConfigured} className={isActive ? BTN : BTN_PRIMARY}>
            <Lock className="h-3.5 w-3.5" />
            {isActive ? 'Reconnect Gmail' : isDisconnected ? 'Connect Gmail' : 'Reconnect Google'}
          </button>
          {!isDisconnected && (
            <button type="button" onClick={handleDisconnect} disabled={disconnecting} className={BTN_DANGER}>
              {disconnecting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              Disconnect
            </button>
          )}
        </div>
      </div>

      <dl className={KV_GRID}>
        <div className={KV_ROW}>
          <dt className={KV_LABEL}>Akun email</dt>
          <dd className={`${KV_VALUE} truncate`}>{isDisconnected ? <span className="font-normal text-gray-400">Belum terhubung</span> : email}</dd>
        </div>
        <div className={KV_ROW}>
          <dt className={KV_LABEL}>Protokol</dt>
          <dd className={KV_VALUE}>Google OAuth2</dd>
        </div>
        <div className={KV_ROW}>
          <dt className={KV_LABEL}>Status</dt>
          <dd className={`${KV_VALUE} gap-2 ${statusView.text}`}>
            <span aria-hidden className={`${DOT} ${statusView.dot}`} />{statusView.label}
          </dd>
        </div>
        <div className={KV_ROW}>
          <dt className={KV_LABEL}>Pengirim</dt>
          <dd className={`${KV_VALUE} truncate font-normal text-gray-600 dark:text-gray-300`}>{'Canva <notifications@canva.com>'}</dd>
        </div>
      </dl>

      {feedback && (
        <div className={`flex items-center gap-2 border-b px-5 py-2.5 text-xs font-semibold ${
          feedback.success
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
            : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300'
        }`}>
          {feedback.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {!googleOAuthConfigured && (
        <div className="border-b border-[#f0f0f0] bg-gray-50/60 px-5 py-3 text-xs text-gray-600 dark:border-[#272a34] dark:bg-[#16181d]/60 dark:text-gray-300">
          <div className="mb-1 font-bold text-gray-900 dark:text-white">Google OAuth perlu disiapkan</div>
          <div>Set <code className="font-mono">GOOGLE_CLIENT_ID</code>, <code className="font-mono">GOOGLE_CLIENT_SECRET</code>, dan <code className="font-mono">EMAIL_TOKEN_SECRET</code>, lalu daftarkan callback URL <code className="font-mono">/can-freelance/api/google/oauth/callback</code>.</div>
        </div>
      )}

      <GoogleOAuthModal
        open={showModal}
        onClose={() => setShowModal(false)}
        currentEmail={email}
        onStart={handleOAuthStart}
      />
    </div>
  );
}
