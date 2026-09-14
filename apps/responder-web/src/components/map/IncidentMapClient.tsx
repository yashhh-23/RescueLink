'use client';

import dynamic from 'next/dynamic';
import { MapPlaceholder } from '@/components/ui/LoadingState';

export const IncidentMapClient = dynamic(
  () => import('./IncidentMap').then((mod) => mod.IncidentMap),
  { ssr: false, loading: () => <MapPlaceholder /> }
);
