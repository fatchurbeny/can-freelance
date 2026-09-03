'use client';

import { useState } from 'react';
import DesignerStatusSelect from './DesignerStatusSelect';
import PromoteDesignerModal from './PromoteDesignerModal';
import { Award, Mail, Phone, CreditCard } from 'lucide-react';

interface DesignerItem {
  id: string;
  displayName: string;
  role?: string | null;
  status: string;
  contractType?: string | null;
  contractStartDate?: string | null;
  inactiveStartDate?: string | null;
  inactiveNote?: string | null;
  resignDate?: string | null;
  promotionDate?: string | null;
  email?: string | null;
  phone?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
}

interface Props {
  designer: DesignerItem;
}

export default function DesignerTableRowActions({ designer }: Props) {
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);

  return (
    <div className="flex items-center justify-center gap-2">
      <DesignerStatusSelect designerId={designer.id} initialStatus={designer.status} />

      <button
        type="button"
        onClick={() => setIsPromoteOpen(true)}
        title="Promote / Edit Designer Profile & Details"
        className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-[#f0f0f0] dark:border-[#272a34] bg-gray-50/80 dark:bg-[#16181d] text-[10px] font-sans font-bold text-gray-700 dark:text-gray-300 hover:text-[#ff5e1f] hover:border-[#ff5e1f]/40 transition-colors cursor-pointer"
      >
        <Award className="w-3 h-3 text-[#ff5e1f]" />
        <span>Promote</span>
      </button>

      <PromoteDesignerModal
        open={isPromoteOpen}
        designer={designer}
        onClose={() => setIsPromoteOpen(false)}
      />
    </div>
  );
}
