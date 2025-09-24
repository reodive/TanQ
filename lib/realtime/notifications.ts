import type { RealtimeNotification } from "./types";

type Listener = (event: RealtimeNotification) => void;

declare global {
  // eslint-disable-next-line no-var
  var __tanqNotificationListeners: Map<string, Set<Listener>> | undefined;
}

const listenerStore = ((): Map<string, Set<Listener>> => {
  if (!globalThis.__tanqNotificationListeners) {
    globalThis.__tanqNotificationListeners = new Map();
  }
  return globalThis.__tanqNotificationListeners;
})();

export function addNotificationListener(userId: string, listener: Listener) {
  let listeners = listenerStore.get(userId);
  if (!listeners) {
    listeners = new Set();
    listenerStore.set(userId, listeners);
  }
  listeners.add(listener);
}

export function removeNotificationListener(userId: string, listener: Listener) {
  const listeners = listenerStore.get(userId);
  if (!listeners) return;
  listeners.delete(listener);
  if (listeners.size === 0) {
    listenerStore.delete(userId);
  }
}

export function emitNotification(userId: string, event: RealtimeNotification) {
  const listeners = listenerStore.get(userId);
  if (!listeners || listeners.size === 0) {
    return;
  }
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (err) {
      console.error("Failed to deliver notification", err);
    }
  });
}

export function emitNotificationMany(userIds: string[], event: RealtimeNotification) {
  const dispatched = new Set<string>();
  for (const userId of userIds) {
    if (dispatched.has(userId)) continue;
    emitNotification(userId, event);
    dispatched.add(userId);
  }
}
