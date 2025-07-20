import { useEffect, useRef } from 'react';
import { supabase } from '../services/SupabaseService';

interface UseRealtimeUpdatesProps {
  onPlantsUpdate?: () => void;
  onCareEventsUpdate?: () => void;
  onPhotosUpdate?: () => void;
}

export const useRealtimeUpdates = ({ 
  onPlantsUpdate, 
  onCareEventsUpdate, 
  onPhotosUpdate 
}: UseRealtimeUpdatesProps) => {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Create a channel for real-time updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'plants'
        },
        (payload) => {
          console.log('Plants table changed:', payload);
          onPlantsUpdate?.();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'care_events'
        },
        (payload) => {
          console.log('Care events table changed:', payload);
          onCareEventsUpdate?.();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plant_photos'
        },
        (payload) => {
          console.log('Plant photos table changed:', payload);
          onPhotosUpdate?.();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Real-time subscriptions active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error');
        } else if (status === 'TIMED_OUT') {
          console.warn('Real-time subscription timed out');
        }
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        console.log('Unsubscribing from real-time updates');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [onPlantsUpdate, onCareEventsUpdate, onPhotosUpdate]);

  return {
    isConnected: channelRef.current?.state === 'joined',
  };
};