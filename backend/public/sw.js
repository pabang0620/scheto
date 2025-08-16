// Service Worker for ScheduleAuto PWA
const CACHE_NAME = 'scheduleauto-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  // Add other critical assets here
];

// API endpoints to cache
const API_CACHE_URLS = [
  '/api/auth/me',
  '/api/dashboard/stats',
  // Add other critical API endpoints
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Ensure the new service worker takes control immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Return offline page if navigation fails
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if network fails
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return a generic offline response for API calls
              return new Response(
                JSON.stringify({
                  error: 'Network unavailable',
                  message: 'This feature requires an internet connection'
                }),
                {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
        })
    );
    return;
  }

  // Handle static assets with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            // Cache successful responses for static assets
            if (response.status === 200 && request.method === 'GET') {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return response;
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: 'You have new schedule updates!',
    icon: '/images/icon-192x192.png',
    badge: '/images/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Schedule',
        icon: '/images/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/images/xmark.png'
      }
    ]
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      options.body = pushData.body || options.body;
      options.title = pushData.title || 'ScheduleAuto';
    } catch (error) {
      console.error('Error parsing push data:', error);
      options.title = 'ScheduleAuto';
    }
  }

  event.waitUntil(
    self.registration.showNotification('ScheduleAuto', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked');
  event.notification.close();

  if (event.action === 'explore') {
    // Open the app and navigate to schedule
    event.waitUntil(
      clients.openWindow('/schedules')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    event.notification.close();
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Sync any pending data when connection is restored
      syncPendingData()
    );
  }
});

// Sync pending data function
async function syncPendingData() {
  try {
    // Get pending data from IndexedDB or localStorage
    const pendingData = await getPendingData();
    
    if (pendingData.length > 0) {
      console.log('Syncing', pendingData.length, 'pending items');
      
      for (const item of pendingData) {
        try {
          await syncItem(item);
          // Remove from pending queue after successful sync
          await removePendingItem(item.id);
        } catch (error) {
          console.error('Failed to sync item:', error);
        }
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions for data sync (implement based on your data layer)
async function getPendingData() {
  // Implement: Get pending data from your storage solution
  return [];
}

async function syncItem(item) {
  // Implement: Sync individual item with server
  return fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item)
  });
}

async function removePendingItem(id) {
  // Implement: Remove synced item from pending queue
  console.log('Removing pending item:', id);
}

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(
      // Perform periodic content sync
      syncContent()
    );
  }
});

async function syncContent() {
  console.log('Performing periodic content sync');
  // Implement: Sync content periodically in the background
}