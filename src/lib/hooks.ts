'use client';

import { useState, useEffect } from 'react';
import { getSetting } from './db';
import { getToday } from './utils';

export function useStartDate() {
  const [startDate, setStartDate] = useState<string>(getToday());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSetting('startDate').then(val => {
      if (val) setStartDate(val);
      setLoaded(true);
    });
  }, []);

  return { startDate, loaded };
}
