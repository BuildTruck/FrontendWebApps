<script>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

export default {
  name: 'NotificationItem',
  props: {
    notification: {
      type: Object,
      required: true
    },
    showActionButton: {
      type: Boolean,
      default: true
    },
    showActionPreview: {
      type: Boolean,
      default: false
    },
    hideMarkRead: {
      type: Boolean,
      default: false
    },
    showMoreOptions: {
      type: Boolean,
      default: false
    },
    allowDelete: {
      type: Boolean,
      default: false
    },
    clickable: {
      type: Boolean,
      default: true
    }
  },
  emits: [
    'click',
    'markAsRead',
    'action',
    'archive',
    'delete'
  ],
  setup(props, { emit }) {
    const router = useRouter();

    // State
    const isLoading = ref(false);
    const showOptionsMenu = ref(false);

    // Computed
    const canClick = computed(() => {
      return props.clickable && !isLoading.value;
    });

    // Methods
    const handleClick = () => {
      if (!canClick.value) return;

      emit('click', props.notification);

      // Auto-mark as read and redirect if has action
      if (props.notification.isUnread) {
        handleMarkAsRead();
      }

      if (props.notification.hasAction) {
        handleAction();
      }
    };

    const handleMarkAsRead = async () => {
      if (isLoading.value || props.notification.isRead) return;

      try {
        isLoading.value = true;
        emit('markAsRead', props.notification.id);
      } finally {
        isLoading.value = false;
        closeOptionsMenu();
      }
    };

    const handleAction = () => {
      if (isLoading.value || !props.notification.hasAction) return;

      emit('action', props.notification);
      closeOptionsMenu();

      // Navigate to action URL
      if (props.notification.actionUrl) {
        if (props.notification.actionUrl.startsWith('http')) {
          // External URL
          window.open(props.notification.actionUrl, '_blank');
        } else {
          // Internal route
          router.push(props.notification.actionUrl);
        }
      }
    };

    const handleArchive = () => {
      if (isLoading.value) return;

      emit('archive', props.notification.id);
      closeOptionsMenu();
    };

    const handleDelete = () => {
      if (isLoading.value) return;

      // Confirm deletion for important notifications
      if (props.notification.isCritical || props.notification.isHighPriority) {
        const confirmed = confirm('¿Estás seguro de que quieres eliminar esta notificación importante?');
        if (!confirmed) return;
      }

      emit('delete', props.notification.id);
      closeOptionsMenu();
    };

    const toggleOptions = () => {
      showOptionsMenu.value = !showOptionsMenu.value;
    };

    const closeOptionsMenu = () => {
      showOptionsMenu.value = false;
    };

    const getPrioritySymbol = (priority) => {
      const symbols = {
        'CRITICAL': '!',
        'HIGH': '↑',
        'NORMAL': '',
        'LOW': '↓'
      };
      return symbols[priority] || '';
    };

    const formatFullDate = (date) => {
      return date.toLocaleString();
    };

    // Click outside directive for options menu
    const clickOutside = {
      beforeMount(el, binding) {
        el.clickOutsideEvent = event => {
          if (!(el === event.target || el.contains(event.target))) {
            binding.value(event);
          }
        };
        document.addEventListener('click', el.clickOutsideEvent);
      },
      unmounted(el) {
        document.removeEventListener('click', el.clickOutsideEvent);
      }
    };

    return {
      // State
      isLoading,
      showOptionsMenu,

      // Computed
      canClick,

      // Methods
      handleClick,
      handleMarkAsRead,
      handleAction,
      handleArchive,
      handleDelete,
      toggleOptions,
      closeOptionsMenu,
      getPrioritySymbol,
      formatFullDate,

      // Directives
      clickOutside
    };
  },

  directives: {
    clickOutside: {
      beforeMount(el, binding) {
        el.clickOutsideEvent = event => {
          if (!(el === event.target || el.contains(event.target))) {
            binding.value(event);
          }
        };
        document.addEventListener('click', el.clickOutsideEvent);
      },
      unmounted(el) {
        document.removeEventListener('click', el.clickOutsideEvent);
      }
    }
  }
};
</script>

<template>
  <div
      class="notification-item"
      :class="{
      'unread': notification.isUnread,
      'critical': notification.isCritical,
      'high': notification.isHighPriority,
      'has-action': notification.hasAction,
      'loading': isLoading
    }"
      @click="handleClick"
  >
    <!-- Unread Indicator -->
    <div v-if="notification.isUnread" class="unread-indicator"></div>

    <!-- Notification Icon -->
    <div class="notification-icon">
      <i
          :class="notification.contextIcon"
          :style="{ color: notification.priorityColor }"
      ></i>

      <!-- Priority Badge for critical/high -->
      <span
          v-if="notification.isHighPriority"
          class="priority-badge"
          :class="notification.priority.toLowerCase()"
      >
        {{ getPrioritySymbol(notification.priority) }}
      </span>
    </div>

    <!-- Notification Content -->
    <div class="notification-content">
      <!-- Title -->
      <div class="notification-title">
        {{ notification.title }}
        <span v-if="notification.relatedProjectId" class="project-indicator">
          <i class="pi pi-home"></i>
        </span>
      </div>

      <!-- Message -->
      <div class="notification-message">
        {{ notification.message }}
      </div>

      <!-- Metadata -->
      <div class="notification-meta">
        <span class="notification-time" :title="formatFullDate(notification.createdAt)">
          {{ notification.timeAgo }}
        </span>
        <span class="notification-context">
          {{ $t(`notifications.contexts.${notification.context.toLowerCase()}`) }}
        </span>
        <span v-if="notification.priority !== 'NORMAL'" class="notification-priority">
          {{ $t(`notifications.priorities.${notification.priority.toLowerCase()}`) }}
        </span>
      </div>

      <!-- Action Preview -->
      <div v-if="notification.hasAction && showActionPreview" class="action-preview">
        <i class="pi pi-external-link"></i>
        <span>{{ notification.actionText || $t('notifications.viewDetails') }}</span>
      </div>
    </div>

    <!-- Notification Actions -->
    <div class="notification-actions" @click.stop>
      <!-- Mark as Read Button -->
      <button
          v-if="notification.isUnread && !hideMarkRead"
          @click="handleMarkAsRead"
          class="btn-mark-read"
          :title="$t('notifications.markAsRead')"
          :disabled="isLoading"
      >
        <i class="pi pi-check"></i>
      </button>

      <!-- Action Button -->
      <button
          v-if="notification.hasAction && showActionButton"
          @click="handleAction"
          class="btn-action"
          :title="notification.actionText || $t('notifications.viewDetails')"
          :disabled="isLoading"
      >
        <i class="pi pi-external-link"></i>
      </button>

      <!-- More Options -->
      <div v-if="showMoreOptions" class="more-options">
        <button
            @click="toggleOptions"
            class="btn-more"
            :class="{ active: showOptionsMenu }"
            :title="$t('notifications.moreOptions')"
        >
          <i class="pi pi-ellipsis-v"></i>
        </button>

        <!-- Options Menu -->
        <div v-if="showOptionsMenu" class="options-menu" v-click-outside="closeOptionsMenu">
          <button
              v-if="!notification.isRead"
              @click="handleMarkAsRead"
              class="option-item"
          >
            <i class="pi pi-check"></i>
            {{ $t('notifications.markAsRead') }}
          </button>

          <button
              v-if="notification.hasAction"
              @click="handleAction"
              class="option-item"
          >
            <i class="pi pi-external-link"></i>
            {{ notification.actionText || $t('notifications.openLink') }}
          </button>

          <button
              @click="handleArchive"
              class="option-item"
          >
            <i class="pi pi-archive"></i>
            {{ $t('notifications.archive') }}
          </button>

          <button
              v-if="allowDelete"
              @click="handleDelete"
              class="option-item danger"
          >
            <i class="pi pi-trash"></i>
            {{ $t('notifications.delete') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    <div v-if="isLoading" class="loading-overlay">
      <i class="pi pi-spin pi-spinner"></i>
    </div>
  </div>
</template>

<style scoped>
.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  position: relative;
  transition: all 0.2s ease;
  cursor: pointer;
  background: white;
}

.notification-item:hover {
  background-color: #f8f9fa;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item.unread {
  background-color: #fff8f5;
  border-left: 3px solid #FF5F01;
}

.notification-item.critical {
  border-left-color: #dc3545;
}

.notification-item.critical.unread {
  background-color: #fdf2f2;
}

.notification-item.high {
  border-left-color: #fd7e14;
}

.notification-item.high.unread {
  background-color: #fef8f1;
}

.notification-item.has-action:hover {
  background-color: #f0f8ff;
}

.notification-item.loading {
  opacity: 0.7;
  pointer-events: none;
}

.unread-indicator {
  position: absolute;
  left: 8px;
  top: 18px;
  width: 6px;
  height: 6px;
  background: #FF5F01;
  border-radius: 50%;
  z-index: 1;
}

.notification-item.critical .unread-indicator {
  background: #dc3545;
}

.notification-item.high .unread-indicator {
  background: #fd7e14;
}

.notification-icon {
  position: relative;
  margin-right: 12px;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  padding-top: 2px;
}

.priority-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  font-size: 0.6rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  border: 1px solid white;
}

.priority-badge.critical {
  background: #dc3545;
}

.priority-badge.high {
  background: #fd7e14;
}

.notification-content {
  flex: 1;
  min-width: 0;
  margin-right: 8px;
}

.notification-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
}

.project-indicator {
  color: #FF5F01;
  font-size: 0.8rem;
}

.notification-message {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 6px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.notification-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.75rem;
  color: #999;
  align-items: center;
}

.notification-time {
  font-weight: 500;
}

.notification-context {
  background: #f1f3f4;
  padding: 2px 6px;
  border-radius: 10px;
  color: #5f6368;
}

.notification-priority {
  background: #fff3cd;
  padding: 2px 6px;
  border-radius: 10px;
  color: #856404;
  font-weight: 500;
}

.notification-item.critical .notification-priority {
  background: #f8d7da;
  color: #721c24;
}

.notification-item.high .notification-priority {
  background: #ffeaa7;
  color: #8b5a00;
}

.action-preview {
  margin-top: 6px;
  padding: 6px 8px;
  background: #e3f2fd;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #1976d2;
  display: flex;
  align-items: center;
  gap: 4px;
}

.notification-actions {
  display: flex;
  gap: 4px;
  align-items: flex-start;
  margin-top: 2px;
}

.btn-mark-read,
.btn-action,
.btn-more {
  padding: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 4px;
  color: #666;
  transition: all 0.2s ease;
  font-size: 0.9rem;
  min-width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-mark-read:hover {
  background: #e8f5e8;
  color: #28a745;
}

.btn-action:hover {
  background: #e3f2fd;
  color: #2196f3;
}

.btn-more:hover,
.btn-more.active {
  background: #f5f5f5;
  color: #333;
}

.btn-mark-read:disabled,
.btn-action:disabled,
.btn-more:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.more-options {
  position: relative;
}

.options-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 140px;
  overflow: hidden;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  border: none;
  background: white;
  color: #333;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.option-item:hover {
  background: #f5f5f5;
}

.option-item.danger {
  color: #dc3545;
}

.option-item.danger:hover {
  background: #fdf2f2;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 10;
}

/* Responsive */
@media (max-width: 768px) {
  .notification-item {
    padding: 10px 12px;
  }

  .notification-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .notification-actions {
    flex-direction: column;
  }

  .btn-mark-read,
  .btn-action,
  .btn-more {
    padding: 4px;
    min-width: 24px;
    height: 24px;
    font-size: 0.8rem;
  }

  .options-menu {
    right: -8px;
  }
}

@media (max-width: 480px) {
  .notification-item {
    padding: 8px 10px;
  }

  .notification-content {
    margin-right: 4px;
  }

  .notification-title {
    font-size: 0.9rem;
  }

  .notification-message {
    font-size: 0.85rem;
    -webkit-line-clamp: 1;
  }

  .action-preview {
    display: none; /* Hide on very small screens */
  }
}

/* Animation for new notifications */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.notification-item.new {
  animation: slideIn 0.3s ease-out;
}

/* Focus styles for accessibility */
.notification-item:focus-within {
  outline: 2px solid #FF5F01;
  outline-offset: -2px;
}

.btn-mark-read:focus,
.btn-action:focus,
.btn-more:focus {
  outline: 2px solid #FF5F01;
  outline-offset: 2px;
}
</style>