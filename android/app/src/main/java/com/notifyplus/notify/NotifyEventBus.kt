package com.notifyplus.notify

/**
 * Decouples the OS-managed [NotifyListenerService] from the React Native bridge. When the RN runtime
 * is alive, [NotifyModule] registers a listener here and forwards events to JS for live UI updates.
 * When the app is closed there is no listener — events are simply dropped here, because the durable
 * record already lives in [PendingStore] and the user has already received the posted notification.
 */
object NotifyEventBus {

  @Volatile
  private var listener: ((String) -> Unit)? = null

  fun setListener(l: ((String) -> Unit)?) {
    listener = l
  }

  fun emit(json: String) {
    listener?.invoke(json)
  }
}
