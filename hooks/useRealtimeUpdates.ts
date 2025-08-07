import { useEffect, useRef } from 'react';
import { supabase } from '../services/SupabaseService';

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

  static getInstance(): RealtimeSubscriptionManager {
    if (!RealtimeSubscriptionManager.instance) {
      RealtimeSubscriptionManager.instance = new RealtimeSubscriptionManager();
    }
    return RealtimeSubscriptionManager.instance;
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
        (payload) => {
          console.log('Plants table changed:', payload.eventType);
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
        (payload) => {
          console.log('Events table changed:', payload.eventType);
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
        (payload) => {
          console.log('Plant photos table changed:', payload.eventType);
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