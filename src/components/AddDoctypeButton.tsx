'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import DoctypeSlideModal from './DoctypeSlideModal';

interface Props {
  className?: string;
  contractRate?: number;
}

export default function AddDoctypeButton({ className, contractRate = 15000 }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          'inline-flex items-center gap-1.5 rounded-full bg-[#ff5e1f] hover:bg-[#ff7038] px-4 py-1.5 text-xs font-sans font-bold text-white shadow-sm transition-all duration-150 cursor-pointer'
        }
        id="add-doctype-button"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Doctype</span>
      </button>

      <DoctypeSlideModal
        open={open}
        onClose={() => setOpen(false)}
        contractRate={contractRate}
      />
    </>
  );
}
