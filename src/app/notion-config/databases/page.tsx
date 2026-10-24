import { redirect } from 'next/navigation';

/** Pages & Databases kini tab di /notion-config; tautan lama diarahkan ke sana. */
export default function DatabasesPage() {
  redirect('/notion-config?tab=pages');
}
