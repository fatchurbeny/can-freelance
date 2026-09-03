'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import AddTeamAccountSlideModal from './AddTeamAccountSlideModal';

interface Props {
  className?: string;
}

export default function AddTeamAccountButton({ className }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          'flex items-center gap-1.5 px-4 py-2.5 bg-[#ff5e1f] hover:bg-[#ff7038] text-white font-sans text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0'
        }
      >
        <Plus className="w-4 h-4 stroke-[3]" />
        <span>Add Team/Account</span>
      </button>

      <AddTeamAccountSlideModal
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
