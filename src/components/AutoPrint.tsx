'use client';

import { useEffect } from 'react';

export default function AutoPrint() {
  useEffect(() => {
    // Wait a brief moment to ensure fonts/styles are loaded
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
