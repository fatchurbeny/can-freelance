'use client';

import { useState } from 'react';
import {
  FileText,
  Eye,
  Edit3,
  Sparkles,
  Link as LinkIcon,
  List,
  Heading2,
  Heading3,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  label?: string;
}

const DEFAULT_WIREFRAME_TEMPLATE = `## Content Wireframe
- https://www.canva.com/design/DAHTYapgius/JZwZLV0Vyee8akUNLOvymQ/edit

## Design Reference
- https://www.canva.com/templates/EAHS6C3N_el-purple-pink-and-white-modern-company-research-proposal-presentation/`;

/**
 * Parses markdown text lines and renders headings, bullet items, and auto-detects URLs.
 */
function MarkdownRenderer({ text }: { text: string }) {
  if (!text || text.trim() === '') {
    return (
      <div className="py-6 px-4 text-center font-sans text-xs text-gray-400 dark:text-gray-500 italic">
        Belum ada body text / content wireframe. Klik edit atau gunakan template pintas.
      </div>
    );
  }

  const lines = text.split('\n');

  // Helper to render text with auto-hyperlinked URLs
  const renderFormattedLineText = (lineText: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = lineText.split(urlRegex);

    return parts.map((part, idx) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={idx}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#ff5e1f] hover:underline font-medium break-all"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="truncate max-w-[480px]">{part}</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-75" />
          </a>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="space-y-3 font-sans text-xs text-gray-800 dark:text-gray-200 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white pt-2 pb-1 border-b border-[#f0f0f0] dark:border-[#272a34] flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5e1f]"></span>
              {trimmed.replace(/^##\s+/, '')}
            </h2>
          );
        }

        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-xs font-bold text-gray-800 dark:text-gray-100 pt-1">
              {trimmed.replace(/^###\s+/, '')}
            </h3>
          );
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.replace(/^[-*]\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-[#ff5e1f] font-bold select-none">•</span>
              <div className="flex-1 min-w-0">{renderFormattedLineText(content)}</div>
            </div>
          );
        }

        if (trimmed === '') {
          return <div key={idx} className="h-1.5" />;
        }

        return <div key={idx}>{renderFormattedLineText(line)}</div>;
      })}
    </div>
  );
}

export default function TaskBodyEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = 'Tuliskan deskripsi task, content wireframe, atau tautan referensi...',
  label = 'Content Wireframe & Design References',
}: Props) {
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>(value ? 'preview' : 'edit');
  const [copied, setCopied] = useState(false);

  const insertText = (prefix: string, suffix: string = '') => {
    if (!onChange || readOnly) return;
    const nextValue = value ? `${value}\n${prefix}${suffix}` : `${prefix}${suffix}`;
    onChange(nextValue);
  };

  const handleApplyTemplate = () => {
    if (!onChange || readOnly) return;
    if (value && value.trim() !== '') {
      onChange(`${value}\n\n${DEFAULT_WIREFRAME_TEMPLATE}`);
    } else {
      onChange(DEFAULT_WIREFRAME_TEMPLATE);
    }
    setActiveTab('edit');
    toast.success('Template wireframe ditambahkan!');
  };

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Teks berhasil disalin ke clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] font-sans text-xs">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-3 sm:px-4 bg-gray-50/50 dark:bg-[#16181d]/50">
        <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300">
          <FileText className="w-4 h-4 text-[#ff5e1f]" />
          <span>{label}</span>
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              onClick={handleApplyTemplate}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#ff5e1f]/30 bg-[#ff5e1f]/10 text-[#ff5e1f] hover:bg-[#ff5e1f]/20 text-[11px] font-bold transition-colors cursor-pointer"
              title="Sisipkan struktur template Wireframe & Reference"
            >
              <Sparkles className="w-3 h-3" />
              <span>+ Template</span>
            </button>
          )}

          {value && value.trim() !== '' && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Salin Teks"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          {!readOnly && (
            <div className="flex items-center border border-[#f0f0f0] dark:border-[#272a34] rounded overflow-hidden">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  activeTab === 'edit'
                    ? 'bg-[#ff5e1f] text-white'
                    : 'bg-white dark:bg-[#16181d] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  activeTab === 'preview'
                    ? 'bg-[#ff5e1f] text-white'
                    : 'bg-white dark:bg-[#16181d] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Eye className="w-3 h-3" />
                <span>Preview</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Body */}
      {activeTab === 'edit' && !readOnly ? (
        <div className="p-0 bg-white dark:bg-[#0d0e12]">
          {/* Formatting Shortcuts Bar */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/30 dark:bg-[#16181d]/30 text-gray-500">
            <button
              type="button"
              onClick={() => insertText('## ')}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              title="Heading 2"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertText('### ')}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              title="Heading 3"
            >
              <Heading3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertText('- ')}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              title="Bulleted List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => insertText('- https://')}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
              title="Link"
            >
              <LinkIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <textarea
            value={value || ''}
            onChange={(e) => onChange?.(e.target.value)}
            placeholder={placeholder}
            rows={7}
            className="w-full p-4 font-mono text-xs text-gray-900 dark:text-white bg-transparent outline-none resize-y min-h-[140px] focus:ring-1 focus:ring-[#ff5e1f] transition-colors"
          />
        </div>
      ) : (
        <div className="p-4 bg-white dark:bg-[#0d0e12] min-h-[100px]">
          <MarkdownRenderer text={value} />
        </div>
      )}
    </div>
  );
}
