"use client";

import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';
import TopBar from '@/components/TopBar';

export default function ContentAccessPage() {
  const [databases, setDatabases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDatabases() {
      try {
        const res = await fetch('/api/notion/databases');
        if (!res.ok) throw new Error('Failed to fetch databases');
        const data = await res.json();
        setDatabases(data.results);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDatabases();
  }, []);

  return (
    <>
      <TopBar badgeLabel="CONTENT ACCESS" />
      <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Accessible Notion Databases</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {!loading && !error && (
        <ul className="space-y-4">
          {databases.map((db: any) => (
            <li key={db.id} className="p-4 border rounded-lg shadow-sm flex items-center gap-3">
              <Database className="w-5 h-5 text-gray-500" />
              <span>{db.title?.[0]?.plain_text || 'Untitled Database'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
    </>
  );
}
