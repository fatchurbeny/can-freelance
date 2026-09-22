'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  label?: string;
}

interface Section {
  id: string;
  heading: string;
  content: string;
}

function parseMarkdownToSections(markdown: string): Section[] {
  if (!markdown) return [];
  const lines = markdown.split('\n');
  const sections: Section[] = [];
  
  let currentHeading = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const match = line.match(/^##\s*(.*)/);
    if (match) {
      if (currentHeading || currentContent.length > 0) {
        sections.push({
          id: Math.random().toString(36).substr(2, 9),
          heading: currentHeading,
          content: currentContent.join('\n').trim()
        });
      }
      currentHeading = match[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }
  
  if (currentHeading || currentContent.length > 0) {
    sections.push({
      id: Math.random().toString(36).substr(2, 9),
      heading: currentHeading,
      content: currentContent.join('\n').trim()
    });
  }
  
  return sections;
}

function compileSectionsToMarkdown(sections: Section[]): string {
  return sections
    .filter(s => s.heading.trim() !== '' || s.content.trim() !== '')
    .map(s => {
      const h = s.heading.trim() ? `## ${s.heading.trim()}` : '';
      return [h, s.content.trim()].filter(Boolean).join('\n');
    })
    .join('\n\n');
}

export default function TaskBodyEditor({
  value,
  onChange,
  readOnly = false,
  label = 'Content Wireframe & Design References',
}: Props) {
  const [copied, setCopied] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    const compiled = compileSectionsToMarkdown(sections);
    if (value !== compiled) {
      setSections(parseMarkdownToSections(value || ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const updateSection = (id: string, field: 'heading' | 'content', newValue: string) => {
    const next = sections.map(s => s.id === id ? { ...s, [field]: newValue } : s);
    setSections(next);
    onChange?.(compileSectionsToMarkdown(next));
  };

  const removeSection = (id: string) => {
    const next = sections.filter(s => s.id !== id);
    setSections(next);
    onChange?.(compileSectionsToMarkdown(next));
  };

  const addSection = (heading = '') => {
    const next = [...sections, { id: Math.random().toString(36).substr(2, 9), heading, content: '' }];
    setSections(next);
    onChange?.(compileSectionsToMarkdown(next));
  };

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('Teks berhasil disalin ke clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyDefaults = () => {
    const next = [
      { id: Math.random().toString(36).substr(2, 9), heading: 'Keywords', content: '' },
      { id: Math.random().toString(36).substr(2, 9), heading: 'Template Wireframe', content: '' },
    ];
    setSections(next);
    onChange?.(compileSectionsToMarkdown(next));
  };

  return (
    <div className="w-full rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#0d0e12] divide-y divide-[#f0f0f0] dark:divide-[#272a34] font-sans text-xs flex flex-col h-full min-h-[300px]">
      <div className="flex shrink-0 items-center justify-between p-3 sm:px-4 bg-gray-50/50 dark:bg-[#16181d]/50">
        <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300">
          <FileText className="w-4 h-4 text-[#ff5e1f]" />
          <span>{label}</span>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      <div className="flex-1 p-0 bg-white dark:bg-[#0d0e12] overflow-y-auto">
        <div className="p-4 space-y-6">
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <p className="text-gray-500 italic text-center max-w-[250px]">
                Tidak ada konten. Anda dapat mengetik manual atau menggunakan format terstruktur.
              </p>
              <button
                onClick={handleApplyDefaults}
                className="px-4 py-2 bg-[#ff5e1f]/10 text-[#ff5e1f] hover:bg-[#ff5e1f]/20 font-bold rounded flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Gunakan Template Struktur
              </button>
            </div>
          ) : (
            sections.map((section, idx) => (
              <div key={section.id} className="group flex flex-col gap-2 relative">
                <div className="flex items-center gap-2">
                  <span className="text-[#ff5e1f] font-mono font-bold select-none shrink-0">##</span>
                  <input
                    type="text"
                    value={section.heading}
                    onChange={(e) => updateSection(section.id, 'heading', e.target.value)}
                    placeholder="Section Heading (e.g. Keywords)"
                    className="flex-1 bg-transparent border-b border-transparent focus:border-[#ff5e1f] hover:border-[#f0f0f0] dark:hover:border-[#272a34] px-1 py-1 text-sm font-bold text-gray-900 dark:text-white outline-none transition-colors"
                    readOnly={readOnly}
                  />
                  {!readOnly && (
                    <button
                      onClick={() => removeSection(section.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <textarea
                  value={section.content}
                  onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                  placeholder="Enter details, bullet points, or URLs here..."
                  className="w-full min-h-[80px] p-3 rounded border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/50 dark:bg-[#16181d]/50 text-gray-900 dark:text-gray-200 outline-none focus:border-[#ff5e1f] focus:ring-1 focus:ring-[#ff5e1f]/50 transition-colors resize-y font-mono text-[11px] leading-relaxed"
                  readOnly={readOnly}
                />
              </div>
            ))
          )}
          
          {!readOnly && sections.length > 0 && (
            <button
              onClick={() => addSection('')}
              className="flex items-center gap-1.5 text-[#ff5e1f] font-bold text-[11px] uppercase tracking-wider hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Section
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
