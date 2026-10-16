'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { createProductionUnitAction } from '@/app/actions/production-unit';
import WizardStepper from './WizardStepper';
import StepInfo from './StepInfo';
import StepNotion from './StepNotion';
import StepSchema from './StepSchema';
import StepOutput from './StepOutput';
import StepReview from './StepReview';
import { StepProgress, StepSuccess } from './StepResult';
import { INITIAL_DATA, STEP, type PlatformOption, type WizardData } from './types';

const DRAFT_KEY = 'production-wizard-draft';

interface Props {
  platforms: PlatformOption[];
  latestSyncLog: any;
}

export default function ProductionWizard({ platforms, latestSyncLog }: Props) {
  const [step, setStep] = useState<number>(STEP.INFO);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);
  const [hydrated, setHydrated] = useState(false);

  // Draft disimpan di localStorage (per origin) agar tetap ada setelah OAuth Dropbox kembali ke halaman ini
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // Langkah progress/success tidak pernah dipulihkan; mulai ulang dari langkah awal
        if (saved.data && typeof saved.step === 'number' && saved.step < STEP.PROGRESS) {
          setData({ ...INITIAL_DATA, ...saved.data });
          setStep(saved.step);
        }
      }
    } catch (_) { /* storage tidak tersedia */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (step >= STEP.PROGRESS) localStorage.removeItem(DRAFT_KEY);
      else localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, data }));
    } catch (_) { /* storage tidak tersedia */ }
  }, [hydrated, step, data]);
  const [notionReady, setNotionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; slug: string } | null>(null);

  useEffect(() => {
    if (!data.platformId && platforms.length > 0) {
      setData((prev) => ({ ...prev, platformId: platforms[0].id }));
    }
  }, [platforms, data.platformId]);

  const platform = platforms.find((p) => p.id === data.platformId);
  const patch = (next: Partial<WizardData>) => setData((prev) => ({ ...prev, ...next }));

  const canNext =
    step === STEP.INFO ? data.name.trim().length > 0 && !!data.platformId
    : step === STEP.NOTION ? notionReady
    : true;

  async function submit() {
    setStep(STEP.PROGRESS);
    setError(null);
    const res = await createProductionUnitAction({
      name: data.name,
      slug: data.slug,
      platformId: data.platformId,
      notionMode: data.notionMode,
      parentPageId: data.parentPageId,
      databaseId: data.databaseId,
      dropboxRoot: data.dropboxRoot,
    });
    if (!res.success) {
      setError(res.error ?? 'Terjadi kesalahan.');
      return;
    }
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) { /* noop */ }
    setCreated({ name: res.unit.name, slug: res.unit.slug });
    setStep(STEP.SUCCESS);
  }

  const showNav = step <= STEP.REVIEW;

  function resetWizard() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (_) { /* noop */ }
    setData({ ...INITIAL_DATA, platformId: platforms[0]?.id ?? '' });
    setNotionReady(false);
    setError(null);
    setCreated(null);
    setStep(STEP.INFO);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] text-[#262626] dark:text-[#f4f4f5] transition-colors">
      <TopBar badgeLabel="PRODUCTION BARU" />
      <div className="flex min-h-[calc(100vh-56px)] flex-col md:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 md:ml-56 flex-col gap-5 p-3 sm:p-6 md:p-8 bg-grid-pattern">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <WizardStepper current={step} />
            {step <= STEP.REVIEW && (
              <button
                type="button"
                onClick={resetWizard}
                className="h-8 px-3 border border-[#f0f0f0] dark:border-[#272a34] font-sans text-[11px] font-semibold text-gray-500 hover:text-[#ff5e1f] cursor-pointer"
              >
                Mulai dari awal
              </button>
            )}
          </div>

          <div className="max-w-3xl w-full space-y-4">
            {step === STEP.INFO && <StepInfo data={data} platforms={platforms} onChange={patch} />}
            {step === STEP.NOTION && (
              <StepNotion data={data} platformId={data.platformId} onChange={patch} onReadyChange={setNotionReady} />
            )}
            {step === STEP.SCHEMA && <StepSchema />}
            {step === STEP.OUTPUT && <StepOutput data={data} platform={platform} onChange={patch} />}
            {step === STEP.REVIEW && <StepReview data={data} platform={platform} />}
            {step === STEP.PROGRESS && (
              <StepProgress error={error} onRetry={() => setStep(STEP.REVIEW)} />
            )}
            {step === STEP.SUCCESS && created && (
              <StepSuccess name={created.name} slug={created.slug} onReset={resetWizard} />
            )}

            {showNav && (
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === STEP.INFO}
                  className="h-11 px-5 border border-[#f0f0f0] dark:border-[#272a34] text-xs font-semibold cursor-pointer disabled:opacity-40"
                >
                  Kembali
                </button>
                {step < STEP.REVIEW ? (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s + 1)}
                    disabled={!canNext}
                    className="h-11 px-5 bg-[#ff5e1f] text-white text-xs font-semibold cursor-pointer disabled:opacity-40"
                  >
                    Lanjut
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    className="h-11 px-5 bg-[#ff5e1f] text-white text-xs font-semibold cursor-pointer"
                  >
                    Buat Production
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
