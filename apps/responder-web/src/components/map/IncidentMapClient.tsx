'use client';

import dynamic from 'next/dynamic';
import { MapPlaceholder } from '@/components/ui/LoadingState';
import type { ComponentProps } from 'react';
import type { IncidentMap as IncidentMapComponent } from './IncidentMap';

export const IncidentMapClient = dynamic<ComponentProps<typeof IncidentMapComponent>>(
  () => import('./IncidentMap').then((mod) => mod.IncidentMap),
  { ssr: false, loading: () => <MapPlaceholder /> }
);
