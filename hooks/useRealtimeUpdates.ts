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
  const callbacksRef = useRef({ onPlantsUpdate, onCareEventsUpdate, onPhotosUpdate });

  // Update callbacks ref without triggering useEffect
  callbacksRef.current = { onPlantsUpdate, onCareEventsUpdate, onPhotosUpdate };

  useEffect(() => {
    // Create a channel for real-time updates with unique name
    const channelName = `schema-db-changes-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('Creating real-time subscription:', channelName);
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'plants'
        },
        (payload) => {
          console.log('Plants table changed:', payload);
          callbacksRef.current.onPlantsUpdate?.();
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
          callbacksRef.current.onCareEventsUpdate?.();
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
          callbacksRef.current.onPhotosUpdate?.();
        }
      )
      .subscribe((status, err) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Real-time subscriptions active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Real-time subscription error:', err);
        } else if (status === 'TIMED_OUT') {
          console.warn('Real-time subscription timed out');
        } else if (status === 'CLOSED') {
          console.log('Real-time subscription closed');
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
  }, []); // No dependencies - callbacks are handled via ref

  return {
    isConnected: channelRef.current?.state === 'joined',
  };
};