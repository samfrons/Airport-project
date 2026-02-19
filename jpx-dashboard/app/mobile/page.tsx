'use client';

import { useEffect } from 'react';
import { useFlightStore } from '@/store/flightStore';
import { MobileDashboard } from '@/components/mobile/MobileDashboard';

export default function MobilePage() {
  const { fetchFlights, flights, loading } = useFlightStore();

  useEffect(() => {
    if (flights.length === 0 && !loading) {
      fetchFlights();
    }
  }, [fetchFlights, flights.length, loading]);

  return <MobileDashboard />;
}
