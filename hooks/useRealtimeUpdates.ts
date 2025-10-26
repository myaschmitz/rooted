import { useEffect, useRef } from 'react';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/SupabaseService';
import { queryKeys } from '../constants/queryKeys';

interface UseRealtimeUpdatesProps {
  onPlantsUpdate?: () => void;
  onEventsUpdate?: () => void;
  onPhotosUpdate?: () => void;
}

// Singleton subscription manager to prevent multiple subscriptions
class RealtimeSubscriptionManager {
  private static instance: RealtimeSubscriptionManager;
  private channel: any = null;
  private subscribers: Set<string> = new Set();
  private callbacks: Map<string, UseRealtimeUpdatesProps> = new Map();
  private isSubscribed = false;
  private retryCount = 0;
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;
  private queryClient: QueryClient | null = null;

  static getInstance(): RealtimeSubscriptionManager {
    if (!RealtimeSubscriptionManager.instance) {
      RealtimeSubscriptionManager.instance = new RealtimeSubscriptionManager();
    }
    return RealtimeSubscriptionManager.instance;
  }

  setQueryClient(queryClient: QueryClient): void {
    this.queryClient = queryClient;
  }

  subscribe(id: string, callbacks: UseRealtimeUpdatesProps): void {
    this.subscribers.add(id);
    this.callbacks.set(id, callbacks);

    if (!this.isSubscribed) {
      this.createSubscription();
    }
  }

  unsubscribe(id: string): void {
    this.subscribers.delete(id);
    this.callbacks.delete(id);

    if (this.subscribers.size === 0) {
      this.destroySubscription();
    }
  }

  updateCallbacks(id: string, callbacks: UseRealtimeUpdatesProps): void {
    if (this.subscribers.has(id)) {
      this.callbacks.set(id, callbacks);
    }
  }

  private createSubscription(): void {
    if (this.channel) {
      this.destroySubscription();
    }

    console.log('Creating shared realtime subscription');
    this.channel = supabase
      .channel('rooted-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plants'
        },
        async (payload) => {
          console.log('Plants table changed:', payload.eventType, payload.new?.id || payload.old?.id);
          
          // Trigger React Query cache invalidation instead of full reloads
          const plantId = payload.new?.id || payload.old?.id;
          if (plantId && this.queryClient) {
            try {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                // Invalidate plants list and specific plant
                this.queryClient.invalidateQueries({ queryKey: queryKeys.plants });
                this.queryClient.invalidateQueries({ queryKey: queryKeys.plant(plantId) });
              } else if (payload.eventType === 'DELETE') {
                // Remove specific plant from cache and invalidate list
                this.queryClient.removeQueries({ queryKey: queryKeys.plant(plantId) });
                this.queryClient.invalidateQueries({ queryKey: queryKeys.plants });
              }
            } catch (error) {
              console.error('Failed to invalidate cache for plants change:', error);
            }
          }
          
          // Only notify subscribers for additional custom logic if needed
          this.notifySubscribers('onPlantsUpdate');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events'
        },
        async (payload) => {
          console.log('Events table changed:', payload.eventType, payload.new?.plant_id || payload.old?.plant_id);
          
          // Trigger React Query cache invalidation instead of full reloads
          const plantId = payload.new?.plant_id || payload.old?.plant_id;
          if (plantId && this.queryClient) {
            try {
              // Invalidate all event-related queries for this plant
              this.queryClient.invalidateQueries({ queryKey: queryKeys.plantEvents(plantId) });
              this.queryClient.invalidateQueries({ queryKey: queryKeys.plantStats(plantId) });
              this.queryClient.invalidateQueries({ queryKey: queryKeys.recentEvents });
            } catch (error) {
              console.error('Failed to invalidate cache for events change:', error);
            }
          }
          
          // Only notify subscribers for additional custom logic if needed
          this.notifySubscribers('onEventsUpdate');
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'plant_photos'
        },
        async (payload) => {
          console.log('Plant photos table changed:', payload.eventType, payload.new?.plant_id || payload.old?.plant_id);
          
          // Trigger React Query cache invalidation instead of full reloads
          const plantId = payload.new?.plant_id || payload.old?.plant_id;
          if (plantId && this.queryClient) {
            try {
              // Invalidate all photo-related queries for this plant
              this.queryClient.invalidateQueries({ queryKey: queryKeys.plantPhotos(plantId) });
              this.queryClient.invalidateQueries({ queryKey: queryKeys.thumbnailPhoto(plantId) });
              this.queryClient.invalidateQueries({ queryKey: queryKeys.allPhotos });
              // Also invalidate plant data since thumbnail might have changed
              this.queryClient.invalidateQueries({ queryKey: queryKeys.plant(plantId) });
            } catch (error) {
              console.error('Failed to invalidate cache for photos change:', error);
            }
          }
          
          // Only notify subscribers for additional custom logic if needed
          this.notifySubscribers('onPhotosUpdate');
        }
      )
      .subscribe((status, err) => {
        console.log('Subscription status:', status);
        this.handleSubscriptionStatus(status, err);
      });
  }

  private handleSubscriptionStatus(status: string, err?: any): void {
    switch (status) {
      case 'SUBSCRIBED':
        console.log('Real-time subscriptions active');
        this.isSubscribed = true;
        this.retryCount = 0;
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
          this.retryTimeout = null;
        }
        break;
      case 'CHANNEL_ERROR':
        console.error('Real-time subscription error:', err);
        this.isSubscribed = false;
        this.retrySubscription();
        break;
      case 'TIMED_OUT':
        console.warn('Real-time subscription timed out');
        this.isSubscribed = false;
        this.retrySubscription();
        break;
      case 'CLOSED':
        console.log('Real-time subscription closed');
        this.isSubscribed = false;
        break;
    }
  }

  private retrySubscription(): void {
    if (this.retryCount < this.maxRetries && this.subscribers.size > 0) {
      this.retryCount++;
      const delay = Math.min(1000 * Math.pow(2, this.retryCount - 1), 10000); // Exponential backoff, max 10s
      
      console.log(`Retrying subscription in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
      
      this.retryTimeout = setTimeout(() => {
        this.destroySubscription();
        this.createSubscription();
      }, delay);
    } else if (this.retryCount >= this.maxRetries) {
      console.error('Max retry attempts reached for realtime subscription');
    }
  }

  private notifySubscribers(callbackType: keyof UseRealtimeUpdatesProps): void {
    this.callbacks.forEach((callbacks) => {
      try {
        callbacks[callbackType]?.();
      } catch (error) {
        console.error(`Error in ${callbackType} callback:`, error);
      }
    });
  }

  private destroySubscription(): void {
    if (this.channel) {
      console.log('Destroying realtime subscription');
      try {
        supabase.removeChannel(this.channel);
      } catch (error) {
        console.error('Error removing channel:', error);
      }
      this.channel = null;
      this.isSubscribed = false;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  getConnectionStatus(): boolean {
    return this.isSubscribed && this.channel?.state === 'joined';
  }
}

export const useRealtimeUpdates = ({ 
  onPlantsUpdate, 
  onEventsUpdate, 
  onPhotosUpdate 
}: UseRealtimeUpdatesProps) => {
  const idRef = useRef<string>(Math.random().toString(36));
  const manager = RealtimeSubscriptionManager.getInstance();
  const queryClient = useQueryClient();

  // Set the query client on the manager for cache invalidation
  useEffect(() => {
    if (queryClient) {
      manager.setQueryClient(queryClient);
    }
  }, [queryClient]);

  useEffect(() => {
    const id = idRef.current;
    manager.subscribe(id, { onPlantsUpdate, onEventsUpdate, onPhotosUpdate });

    return () => {
      manager.unsubscribe(id);
    };
  }, []);

  // Update callbacks without resubscribing
  useEffect(() => {
    const id = idRef.current;
    manager.updateCallbacks(id, { onPlantsUpdate, onEventsUpdate, onPhotosUpdate });
  }, [onPlantsUpdate, onEventsUpdate, onPhotosUpdate]);

  return {
    isConnected: manager.getConnectionStatus(),
  };
};