import { defineStore } from 'pinia'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: []
  }),

  actions: {
    add({ title, message, type = 'info', duration = 6000, actionLabel = null, onAction = null }) {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 6)
      const notification = {
        id,
        title,
        message,
        type,
        actionLabel,
        onAction
      }

      this.notifications.push(notification)

      if (duration && duration > 0) {
        setTimeout(() => {
          this.remove(id)
        }, duration)
      }

      return id
    },

    remove(id) {
      const index = this.notifications.findIndex((n) => n.id === id)
      if (index !== -1) {
        this.notifications.splice(index, 1)
      }
    },

    success(title, message, options = {}) {
      return this.add({ title, message, type: 'success', ...options })
    },

    error(title, message, options = {}) {
      return this.add({ title, message, type: 'danger', duration: 9000, ...options })
    },

    warning(title, message, options = {}) {
      return this.add({ title, message, type: 'warning', ...options })
    },

    info(title, message, options = {}) {
      return this.add({ title, message, type: 'info', ...options })
    }
  }
})
