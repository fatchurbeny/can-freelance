import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache, type ReactNode } from 'react';
import { Eye, FileText } from 'lucide-react';
import prisma from '@/lib/prisma';
import DesignBriefPreview from '@/components/task-detail/DesignBriefPreview';
import FieldValueDisplay, { type CustomFieldOption } from '@/components/custom-fields/FieldValueDisplay';

/**
 * Halaman publik view-only satu task (tanpa login; dikecualikan di src/proxy.ts).
 * Hanya field di allowlist ini yang dibaca: tanpa komentar, designer, payroll/tarif, pool score,
 * link Canva/Dropbox/upload. Token dibuat & dicabut lewat src/app/actions/task-share.ts.
 */
export const dynamic = 'force-dynamic';

/** Tipe field tambahan yang aman ditampilkan (people/files/relation/url bisa berisi data internal). */
const PUBLIC_CUSTOM_TYPES = new Set(['select', 'status', 'multi_select', 'date', 'checkbox', 'number', 'rich_text', 'text']);

const loadSharedTask = cache(async (token: string) => {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const link = await prisma.taskShareLink.findUnique({
    where: { token },
    select: {
      revokedAt: true,
      task: {
        select: {
          name: true,
          pages: true,
          qtySubmit: true,
          languages: true,
          priority: true,
          license: true,
          taskMonth: true,
          bodyText: true,
          lastEditedTime: true,
          customFields: true,
          doctype: { select: { displayName: true } },
          designStatus: { select: { displayName: true } },
          taskAccounts: { select: { account: { select: { displayName: true, color: true } } } },
          productionUnit: {
            select: {
              name: true,
              disabledFields: true,
              fields: {
                where: { visible: true, missingInNotion: false },
                select: { name: true, type: true, options: true },
                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              },
            },
          },
        },
      },
    },
  });
  if (!link || link.revokedAt) return null;
  return link.task;
});

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const task = await loadSharedTask((await params).token);
  return {
    title: task ? `${task.name || 'Untitled Task'} · CAN-Freelance` : 'Link tidak ditemukan',
    robots: { index: false, follow: false },
  };
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] sm:grid-cols-[180px_1fr] items-center gap-3 px-4 py-2.5 text-xs">
      <span className="font-semibold text-gray-500 dark:text-gray-400">{label}</span>
      <div className="min-w-0 flex flex-wrap items-center gap-1.5 font-bold text-gray-900 dark:text-white">{children}</div>
    </div>
  );
}

const Empty = () => <span className="text-gray-400 dark:text-gray-500">—</span>;

export default async function SharedTaskPage({ params }: { params: Promise<{ token: string }> }) {
  const task = await loadSharedTask((await params).token);
  if (!task) notFound();

  const off = new Set(task.productionUnit.disabledFields);
  const custom = (task.customFields ?? {}) as Record<string, unknown>;
  const customFields = task.productionUnit.fields.filter((f) => PUBLIC_CUSTOM_TYPES.has(f.type));
  const num = (v: unknown) => (v == null ? null : Number(v));
  const pages = num(task.pages);
  const qty = num(task.qtySubmit);
  const lastEdited = new Date(task.lastEditedTime.getTime()).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const brief = task.bodyText || '';

  return (
    <div className="min-h-screen bg-white dark:bg-[#0d0e12] font-sans">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#f0f0f0] dark:border-[#272a34] bg-white/90 dark:bg-[#0d0e12]/90 backdrop-blur px-4 sm:px-6 h-12">
        <span className="min-w-0 truncate text-xs font-bold text-gray-700 dark:text-gray-300">
          CAN-Freelance <span className="text-gray-400 dark:text-gray-500 font-semibold">/ {task.productionUnit.name}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 border border-[#f0f0f0] dark:border-[#272a34] px-2 py-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
          <Eye className="w-3.5 h-3.5" />
          Hanya lihat
        </span>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <FileText className="w-8 h-8 text-[#ff5e1f]" />
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white break-words">
          {task.name || 'Untitled Task'}
        </h1>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Terakhir diubah {lastEdited}</p>

        <section className="mt-6 border border-[#f0f0f0] dark:border-[#272a34] divide-y divide-[#f0f0f0] dark:divide-[#272a34]">
          <Row label="Status">
            {task.designStatus ? (
              <span className="px-2 py-0.5 text-[11px] rounded bg-[#ff5e1f]/15 text-[#ff5e1f]">{task.designStatus.displayName}</span>
            ) : <Empty />}
          </Row>
          {!off.has('doctype') && <Row label="Doctype">{task.doctype?.displayName ?? <Empty />}</Row>}
          {!off.has('brand') && (
            <Row label="Brand">
              {task.taskAccounts.length ? task.taskAccounts.map(({ account }) => (
                <span
                  key={account.displayName}
                  className="px-2 py-0.5 text-[11px] rounded"
                  style={{ backgroundColor: `${account.color || '#6e7687'}25`, color: account.color || '#6e7687' }}
                >
                  {account.displayName}
                </span>
              )) : <Empty />}
            </Row>
          )}
          {!off.has('pages') && <Row label="Pages">{pages ?? <Empty />}</Row>}
          {!off.has('qtySubmit') && <Row label="QTY Submit">{qty ?? <Empty />}</Row>}
          {!off.has('taskMonth') && <Row label="Task Month">{task.taskMonth || <Empty />}</Row>}
          {!off.has('languages') && <Row label="Bahasa">{task.languages.length ? task.languages.join(', ') : <Empty />}</Row>}
          {!off.has('priority') && <Row label="Priority">{task.priority || <Empty />}</Row>}
          {!off.has('license') && <Row label="License">{task.license || <Empty />}</Row>}
          {customFields.map((f) => (
            <Row key={f.name} label={f.name}>
              <FieldValueDisplay field={{ type: f.type, options: f.options as CustomFieldOption[] | null }} value={custom[f.name]} />
            </Row>
          ))}
        </section>

        <h2 className="mt-10 mb-4 text-lg font-bold text-gray-900 dark:text-white">Design Brief</h2>
        {brief.trim() ? (
          <DesignBriefPreview bodyText={brief} />
        ) : (
          <p className="border border-[#f0f0f0] dark:border-[#272a34] py-10 text-center text-xs text-gray-500 dark:text-gray-400">
            Belum ada Design Brief.
          </p>
        )}
      </main>
    </div>
  );
}
