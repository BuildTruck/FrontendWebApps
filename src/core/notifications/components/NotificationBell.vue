<script>
import {ref, reactive, computed, onMounted, onUnmounted, nextTick, watch} from 'vue';
import { useRouter } from 'vue-router';
import { AuthService} from "../../../auth/services/auth-api.service.js";
import { notificationApiService } from '../services/notification-api.service.js';
import { notificationWebSocketService } from '../services/notification-websocket.service.js';
import { NotificationSummary} from "../models/notification-summary.entity.js";
import NotificationPreferences from './NotificationPreferences.vue';

export default {
  name: 'NotificationBell',
  components: {
     NotificationPreferences
  },
  setup() {
    const router = useRouter();

    // Reactive state
    const showDropdown = ref(false);

    const showFilters = ref(false);
    const loading = ref(false);
    const hasMore = ref(true);
    const currentPage = ref(1);
    const pageSize = 10;

    // Data
    const notifications = ref([]);
    const summary = ref(new NotificationSummary());
    const user = ref(AuthService.getCurrentUser());

    // Filters
    const selectedContext = ref('');
    const selectedPriority = ref('');
    const showUnreadOnly = ref(false);

    // Available contexts based on user role
    const availableContexts = computed(() => {
      const allContexts = ['SYSTEM', 'PROJECTS', 'PERSONNEL', 'MATERIALS', 'MACHINERY', 'INCIDENTS'];

      switch (user.value?.role) {
        case 'Admin':
          return allContexts;
        case 'Manager':
          return ['PROJECTS', 'PERSONNEL', 'MATERIALS', 'MACHINERY', 'INCIDENTS'];
        case 'Supervisor':
          return ['PERSONNEL', 'MATERIALS', 'MACHINERY', 'INCIDENTS'];
        default:
          return allContexts;
      }
    });

    // Methods
    const toggleDropdown = () => {
      console.log('ANTES - showDropdown:', showDropdown.value);
      showDropdown.value = !showDropdown.value;
      console.log('DESPUÉS - showDropdown:', showDropdown.value);

      if (showDropdown.value) {
        loadNotifications(true);
        showFilters.value = false;
      }
    };

    const closeDropdown = () => {
      showDropdown.value = false;
      showFilters.value = false;
    };

    const toggleFilters = () => {
      showFilters.value = !showFilters.value;
    };

    const goToSettings = () => {
      closeDropdown();

      try {
        const currentPath = router.currentRoute.value.path;

        // Buscar el prefijo del rol en el path
        const rolePrefix = currentPath.match(/^\/(admin|manager|supervisor)\//)?.[1];

        const settingsRoute = rolePrefix
            ? `/${rolePrefix}/configuraciones`
            : '/configuraciones';

        console.log(`Path actual: ${currentPath} → Configuraciones: ${settingsRoute}`);
        router.push(settingsRoute);

      } catch (error) {
        console.error('Error al navegar a configuraciones:', error);
        router.push('/configuraciones');
      }
    };

    const loadNotifications = async (reset = false) => {
      if (loading.value) return;

      try {
        loading.value = true;

        if (reset) {
          currentPage.value = 1;
          notifications.value = [];
          hasMore.value = true;
        }

        const filters = {
          unread: showUnreadOnly.value || undefined,
          context: selectedContext.value || undefined,
          priority: selectedPriority.value || undefined
        };

        const response = await notificationApiService.getNotifications(
            currentPage.value,
            pageSize,
            filters
        );

        if (reset) {
          notifications.value = response.notifications;
        } else {
          notifications.value.push(...response.notifications);
        }

        hasMore.value = response.hasMore;
        currentPage.value++;

      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        loading.value = false;
      }
    };

    const loadSummary = async () => {
      try {
        const summaryData = await notificationApiService.getSummary();
        summary.value = summaryData;
      } catch (error) {
        console.error('Error loading summary:', error);
      }
    };

    const markAsRead = async (notificationId) => {
      try {
        await notificationApiService.markAsRead(notificationId);

        // Update local state
        const notification = notifications.value.find(n => n.id === notificationId);
        if (notification) {
          notification.markAsRead();
          summary.value.markAsRead(notification);
        }

        // Notify WebSocket
        await notificationWebSocketService.markNotificationAsRead(notificationId);

      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    };

    const markAllAsRead = async () => {
      try {
        loading.value = true;
        await notificationApiService.markAllAsRead();

        // Update local state
        notifications.value.forEach(n => {
          if (n.isUnread) {
            n.markAsRead();
          }
        });

        summary.value.markAllAsRead();

      } catch (error) {
        console.error('Error marking all as read:', error);
      } finally {
        loading.value = false;
      }
    };

    const handleNotificationClick = async (notification) => {
      // Mark as read if unread
      if (notification.isUnread) {
        await markAsRead(notification.id);
      }

      // If has action URL, redirect and close dropdown
      if (notification.hasAction) {
        handleActionClick(notification);
      }
    };

    const handleActionClick = (notification) => {
      if (notification.actionUrl) {
        // Close dropdown
        closeDropdown();

        // Navigate to URL
        if (notification.actionUrl.startsWith('http')) {
          // External URL
          window.open(notification.actionUrl, '_blank');
        } else {
          // Internal route
          router.push(notification.actionUrl);
        }
      }
    };

    const onFilterChange = () => {
      loadNotifications(true);
    };

    const onScroll = (event) => {
      const { target } = event;
      const { scrollTop, scrollHeight, clientHeight } = target;

      // Load more when near bottom
      if (scrollTop + clientHeight >= scrollHeight - 100 && hasMore.value && !loading.value) {
        loadNotifications(false);
      }
    };


    // WebSocket event handlers
    const handleNewNotification = (notification) => {
      // Add to beginning of list if it matches current filters
      const matchesFilters = (!selectedContext.value || notification.context === selectedContext.value) &&
          (!selectedPriority.value || notification.priority === selectedPriority.value) &&
          (!showUnreadOnly.value || notification.isUnread);

      if (matchesFilters) {
        notifications.value.unshift(notification);
      }

      // Update summary
      summary.value.addNotification(notification);
    };

    const handleUnreadCountUpdate = (count) => {
      summary.value.unreadCount = count;
    };

    const handleNotificationRead = (notificationId) => {
      const notification = notifications.value.find(n => n.id === notificationId);
      if (notification) {
        notification.markAsRead();
        summary.value.markAsRead(notification);
      }
    };


    // Lifecycle
    onMounted(async () => {
      // Initialize WebSocket
      try {
        await notificationWebSocketService.initialize();

        // Setup WebSocket listeners
        notificationWebSocketService.on('newNotification', handleNewNotification);
        notificationWebSocketService.on('unreadCountUpdate', handleUnreadCountUpdate);
        notificationWebSocketService.on('notificationRead', handleNotificationRead);

      } catch (error) {
        console.error('Error initializing WebSocket:', error);
      }

      // Load initial data
      await loadSummary();
    });

    onUnmounted(() => {
      // Cleanup WebSocket listeners
      notificationWebSocketService.off('newNotification', handleNewNotification);
      notificationWebSocketService.off('unreadCountUpdate', handleUnreadCountUpdate);
      notificationWebSocketService.off('notificationRead', handleNotificationRead);
    });

    watch(showDropdown, (newVal) => {
      console.log('showDropdown cambió a:', newVal);
    });

    return {
      // State
      showDropdown,
      showFilters,
      loading,
      hasMore,
      notifications,
      summary,
      selectedContext,
      selectedPriority,
      showUnreadOnly,
      availableContexts,

      goToSettings,
      // Methods
      toggleDropdown,
      closeDropdown,
      toggleFilters,
      loadNotifications,
      markAsRead,
      markAllAsRead,
      handleNotificationClick,
      handleActionClick,
      onFilterChange,
      onScroll,


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
  <div class="notification-bell-container" v-click-outside="closeDropdown">
    <!-- Bell Icon with Badge -->
    <div
        class="notification-bell"
        @click="toggleDropdown"
        :class="{
        'has-unread': summary.hasUnread,
        'critical': summary.hasCritical,
        'high': summary.hasHigh,
        'animate': summary.shouldAnimate()
      }"
    >
      <i class="pi pi-bell"></i>

      <!-- Badge Counter -->
      <span
          v-if="summary.hasUnread"
          class="notification-badge"
          :style="{ backgroundColor: summary.getBadgeColor() }"
      >
        {{ summary.getBadgeText() }}
      </span>
    </div>

    <!-- Dropdown Panel -->
    <div v-if="showDropdown" class="notification-dropdown" @click.stop>
      <!-- Header -->
      <div class="notification-header">
        <h3>{{ $t('notifications.title') }}</h3>
        <div class="notification-actions">
          <button
              v-if="summary.hasUnread"
              @click="markAllAsRead"
              class="btn-mark-all"
              :disabled="loading"
          >
            <i class="pi pi-check"></i>
            {{ $t('notifications.markAllRead') }}
          </button>
          <button
              @click="toggleFilters"
              class="btn-filters"
              :class="{ active: showFilters }"
          >
            <i class="pi pi-filter"></i>
          </button>
          <button @click="goToSettings" class="btn-settings">
            <i class="pi pi-cog"></i>
          </button>
        </div>
      </div>

      <!-- Summary Stats -->
      <div v-if="summary.hasUnread" class="notification-summary">
        <div class="summary-item" v-for="contextStat in summary.contextSummary" :key="contextStat.context">
          <i :class="contextStat.icon"></i>
          <span>{{ $t(`notifications.contexts.${contextStat.context.toLowerCase()}`) }}: {{ contextStat.count }}</span>
        </div>
      </div>

      <!-- Filters (if enabled) -->
      <div v-if="showFilters" class="notification-filters">
        <select v-model="selectedContext" @change="onFilterChange">
          <option value="">{{ $t('notifications.filters.allContexts') }}</option>
          <option v-for="context in availableContexts" :key="context" :value="context">
            {{ $t(`notifications.contexts.${context.toLowerCase()}`) }}
          </option>
        </select>

        <select v-model="selectedPriority" @change="onFilterChange">
          <option value="">{{ $t('notifications.filters.allPriorities') }}</option>
          <option value="CRITICAL">{{ $t('notifications.priorities.critical') }}</option>
          <option value="HIGH">{{ $t('notifications.priorities.high') }}</option>
          <option value="NORMAL">{{ $t('notifications.priorities.normal') }}</option>
          <option value="LOW">{{ $t('notifications.priorities.low') }}</option>
        </select>

        <button @click="showUnreadOnly = !showUnreadOnly" :class="{ active: showUnreadOnly }">
          {{ $t('notifications.filters.unreadOnly') }}
        </button>
      </div>

      <!-- Notifications List -->
      <div class="notifications-list" ref="notificationsList" @scroll="onScroll">
        <div v-if="loading && notifications.length === 0" class="loading-state">
          <i class="pi pi-spin pi-spinner"></i>
          {{ $t('notifications.loading') }}
        </div>

        <div v-else-if="notifications.length === 0" class="empty-state">
          <i class="pi pi-inbox"></i>
          <p>{{ $t('notifications.empty') }}</p>
        </div>

        <div v-else>
          <div
              v-for="notification in notifications"
              :key="notification.id"
              class="notification-item"
              :class="{
              'unread': notification.isUnread,
              'critical': notification.isCritical,
              'high': notification.isHighPriority
            }"
              @click="handleNotificationClick(notification)"
          >
            <!-- Notification Icon -->
            <div class="notification-icon">
              <i :class="notification.contextIcon" :style="{ color: notification.priorityColor }"></i>
            </div>

            <!-- Notification Content -->
            <div class="notification-content">
              <div class="notification-title">{{ notification.title }}</div>
              <div class="notification-message">{{ notification.message }}</div>
              <div class="notification-meta">
                <span class="notification-time">{{ notification.timeAgo }}</span>
                <span class="notification-context">{{ $t(`notifications.contexts.${notification.context.toLowerCase()}`) }}</span>
              </div>
            </div>

            <!-- Notification Actions -->
            <div class="notification-actions">
              <button
                  v-if="notification.isUnread"
                  @click.stop="markAsRead(notification.id)"
                  class="btn-mark-read"
                  :title="$t('notifications.markAsRead')"
              >
                <i class="pi pi-check"></i>
              </button>

              <button
                  v-if="notification.hasAction"
                  @click.stop="handleActionClick(notification)"
                  class="btn-action"
                  :title="notification.actionText || $t('notifications.viewDetails')"
              >
                <i class="pi pi-external-link"></i>
              </button>
            </div>

            <!-- Unread Indicator -->
            <div v-if="notification.isUnread" class="unread-indicator"></div>
          </div>

          <!-- Load More Indicator -->
          <div v-if="loading && notifications.length > 0" class="loading-more">
            <i class="pi pi-spin pi-spinner"></i>
            {{ $t('notifications.loadingMore') }}
          </div>

          <!-- No More Items -->
          <div v-if="!hasMore && notifications.length > 0" class="no-more-items">
            {{ $t('notifications.noMoreItems') }}
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ================================================================
   NOTIFICATION BELL - ULTRA MODERN LIGHT MODE
   ================================================================ */

.notification-bell-container {
  position: relative;
  display: inline-block;
}

.notification-bell {
  position: relative;
  cursor: pointer;
  padding: 10px;
  border-radius: 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #6b7280;
  font-size: 1.4rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
  border: transparent;
}

.notification-bell::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 95, 1, 0.05), rgba(245, 158, 11, 0.05));
  border-radius: 20px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.notification-bell:hover {
  background: linear-gradient(135deg, rgba(249, 250, 251, 0.95) 0%, rgba(243, 244, 246, 0.9) 100%);
  color: #374151;
  transform: translateY(-2px) scale(1.05);
  box-shadow:
      0 8px 25px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.notification-bell:hover::before {
  opacity: 1;
}

.notification-bell.has-unread {
  color: #FF5F01;
  background: linear-gradient(135deg, rgba(255, 95, 1, 0.15) 0%, rgba(245, 158, 11, 0.1) 100%);
  border-color: rgba(255, 95, 1, 0.3);
  box-shadow:
      0 4px 12px rgba(255, 95, 1, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.notification-bell.critical {
  color: #dc2626;
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(185, 28, 28, 0.1) 100%);
  border-color: rgba(220, 38, 38, 0.3);
  box-shadow:
      0 4px 12px rgba(220, 38, 38, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.notification-bell.animate {
  animation: bellShake 0.6s ease-in-out;
}

@keyframes bellShake {
  0%, 100% { transform: rotate(0deg) translateY(-2px) scale(1.05); }
  25% { transform: rotate(-8deg) translateY(-2px) scale(1.05); }
  75% { transform: rotate(8deg) translateY(-2px) scale(1.05); }
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: linear-gradient(135deg, #FF5F01 0%, #f59e0b 100%);
  color: white;
  border-radius: 50%;
  min-width: 22px;
  height: 22px;
  font-size: 0.8rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid white;
  line-height: 1;
  box-shadow:
      0 4px 12px rgba(255, 95, 1, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow:
        0 4px 12px rgba(255, 95, 1, 0.4),
        0 0 0 0 rgba(255, 95, 1, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  50% {
    box-shadow:
        0 4px 12px rgba(255, 95, 1, 0.4),
        0 0 0 8px rgba(255, 95, 1, 0),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
}

.notification-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 450px;
  max-height: 650px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%);
  backdrop-filter: blur(25px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  box-shadow:
      0 25px 50px rgba(0, 0, 0, 0.1),
      0 10px 20px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideInDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.notification-dropdown::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #FF5F01, #f59e0b, #10b981, #3b82f6, #8b5cf6);
  background-size: 300% 100%;
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* ================================================================
   HEADER MEJORADO
   ================================================================ */

.notification-header {
  padding: 24px 28px 20px;
  border-bottom: 1px solid rgba(243, 244, 246, 0.8);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, rgba(250, 250, 250, 0.9) 0%, rgba(255, 255, 255, 0.8) 100%);
  backdrop-filter: blur(10px);
}

.notification-header h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.025em;
  display: flex;
  align-items: center;
  gap: 10px;
}

.notification-header h3::before {
  content: '';
  font-family: 'primeicons';
  font-size: 1.3rem;
  background: linear-gradient(135deg, #FF5F01, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.notification-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btn-mark-all,
.btn-filters,
.btn-settings {
  padding: 10px 16px;
  border: none;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  position: relative;
  overflow: hidden;
}

.btn-mark-all::before,
.btn-filters::before,
.btn-settings::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  transition: left 0.5s;
}

.btn-mark-all {
  color: #FF5F01;
  background: linear-gradient(135deg, rgba(255, 95, 1, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
}

.btn-mark-all:hover {
  background: linear-gradient(135deg, #FF5F01 0%, #f59e0b 100%);
  color: white;
  transform: translateY(-2px) scale(1.05);
  box-shadow:
      0 8px 25px rgba(255, 95, 1, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.btn-mark-all:hover::before {
  left: 100%;
}

.btn-filters,
.btn-settings {
  color: #6b7280;
}

.btn-filters:hover,
.btn-settings:hover,
.btn-filters.active {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
  color: white;
  transform: translateY(-2px) scale(1.05);
  box-shadow:
      0 8px 25px rgba(107, 114, 128, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.btn-filters:hover::before,
.btn-settings:hover::before {
  left: 100%;
}

/* ================================================================
   SUMMARY MEJORADO
   ================================================================ */

.notification-summary {
  padding: 20px 28px;
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.8) 100%);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  font-size: 0.875rem;
  backdrop-filter: blur(10px);
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(229, 231, 235, 0.3);
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-item:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow:
      0 8px 25px rgba(255, 95, 1, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 95, 1, 0.3);
}

.summary-item i {
  color: #FF5F01;
  font-size: 1.1rem;
  text-shadow: 0 0 10px rgba(255, 95, 1, 0.3);
}

/* ================================================================
   FILTROS ULTRA MODERNOS
   ================================================================ */

.notification-filters {
  padding: 20px 28px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  background: linear-gradient(135deg, rgba(250, 251, 252, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  backdrop-filter: blur(10px);
}

.notification-filters select,
.notification-filters button {
  padding: 10px 16px;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
  color: #64748b;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  position: relative;
  overflow: hidden;
}

.notification-filters select::before,
.notification-filters button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 95, 1, 0.1), rgba(245, 158, 11, 0.1));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.notification-filters select:focus,
.notification-filters button:focus {
  outline: none;
  border-color: #FF5F01;
  box-shadow:
      0 0 0 4px rgba(255, 95, 1, 0.15),
      0 8px 25px rgba(255, 95, 1, 0.2);
  transform: translateY(-2px);
}

.notification-filters select:hover,
.notification-filters button:hover {
  border-color: rgba(255, 95, 1, 0.3);
  color: #FF5F01;
  transform: translateY(-2px) scale(1.02);
  box-shadow:
      0 8px 25px rgba(255, 95, 1, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.notification-filters button.active {
  background: linear-gradient(135deg, #FF5F01 0%, #f59e0b 100%);
  color: white;
  border-color: #FF5F01;
  transform: translateY(-2px) scale(1.02);
  box-shadow:
      0 8px 25px rgba(255, 95, 1, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

/* ================================================================
   LISTA DE NOTIFICACIONES MEJORADA
   ================================================================ */

.notifications-list {
  flex: 1;
  overflow-y: auto;
  max-height: 420px;
}

.notifications-list::-webkit-scrollbar {
  width: 8px;
}

.notifications-list::-webkit-scrollbar-track {
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  border-radius: 10px;
}

.notifications-list::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #FF5F01, #f59e0b);
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(255, 95, 1, 0.3);
}

.notifications-list::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 4px 8px rgba(245, 158, 11, 0.4);
}

.loading-state,
.empty-state {
  padding: 60px 28px;
  text-align: center;
  color: #6b7280;
}

.loading-state i {
  font-size: 3rem;
  color: #FF5F01;
  margin-bottom: 20px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state i {
  font-size: 4rem;
  margin-bottom: 20px;
  display: block;
  color: #d1d5db;
  opacity: 0.6;
}

.empty-state p {
  margin: 12px 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
}

.empty-state p:last-child {
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 400;
}

/* ================================================================
   ITEMS DE NOTIFICACIÓN MEJORADOS
   ================================================================ */

.notification-item {
  display: flex;
  padding: 20px 28px;
  border-bottom: 1px solid rgba(243, 244, 246, 0.8);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
  backdrop-filter: blur(10px);
}

.notification-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 95, 1, 0.03), rgba(245, 158, 11, 0.03));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.notification-item:hover {
  background: linear-gradient(135deg, rgba(250, 251, 252, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%);
  transform: translateX(6px);
  box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.notification-item:hover::before {
  opacity: 1;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item.unread {
  background: linear-gradient(135deg, rgba(255, 248, 245, 0.95) 0%, rgba(254, 247, 240, 0.9) 100%);
  border-left: 5px solid #FF5F01;
  box-shadow: inset 0 1px 0 rgba(255, 95, 1, 0.15);
  position: relative;
}

.notification-item.unread::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: linear-gradient(180deg, #FF5F01, #f59e0b);
  box-shadow: 0 0 10px rgba(255, 95, 1, 0.4);
}

.notification-item.unread:hover {
  background: linear-gradient(135deg, rgba(254, 247, 240, 0.98) 0%, rgba(253, 215, 170, 0.9) 100%);
}

.notification-item.critical {
  border-left-color: #dc2626;
  background: linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(254, 226, 226, 0.9) 100%);
}

.notification-item.critical::after {
  background: linear-gradient(180deg, #dc2626, #b91c1c);
  box-shadow: 0 0 10px rgba(220, 38, 38, 0.4);
}

.notification-item.critical:hover {
  background: linear-gradient(135deg, rgba(254, 226, 226, 0.98) 0%, rgba(252, 202, 202, 0.9) 100%);
}

.notification-item.high {
  border-left-color: #f59e0b;
  background: linear-gradient(135deg, rgba(255, 251, 235, 0.95) 0%, rgba(254, 243, 199, 0.9) 100%);
}

.notification-item.high::after {
  background: linear-gradient(180deg, #f59e0b, #d97706);
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
}

.notification-item.high:hover {
  background: linear-gradient(135deg, rgba(254, 243, 199, 0.98) 0%, rgba(253, 215, 170, 0.9) 100%);
}

.notification-icon {
  margin-right: 18px;
  font-size: 1.4rem;
  display: flex;
  align-items: flex-start;
  padding-top: 6px;
  color: #6b7280;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 700;
  margin-bottom: 8px;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1rem;
  line-height: 1.4;
}

.notification-message {
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 10px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.notification-meta {
  display: flex;
  gap: 16px;
  font-size: 0.8rem;
  color: #9ca3af;
  align-items: center;
}

.notification-time {
  font-weight: 600;
  color: #64748b;
}

.notification-context {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
  padding: 4px 12px;
  border-radius: 16px;
  color: #6b7280;
  font-weight: 600;
  font-size: 0.75rem;
  box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.notification-actions {
  display: flex;
  gap: 8px;
  margin-left: 16px;
  align-items: flex-start;
  padding-top: 6px;
}

.btn-mark-read,
.btn-action {
  padding: 10px 12px;
  border: none;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
  cursor: pointer;
  border-radius: 12px;
  color: #6b7280;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.875rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(229, 231, 235, 0.5);
  box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

.btn-mark-read:hover {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #16a34a;
  border-color: #bbf7d0;
  transform: translateY(-2px) scale(1.1);
  box-shadow:
      0 8px 25px rgba(22, 163, 74, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.btn-action:hover {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #2563eb;
  border-color: #bfdbfe;
  transform: translateY(-2px) scale(1.1);
  box-shadow:
      0 8px 25px rgba(37, 99, 235, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.unread-indicator {
  position: absolute;
  left: 16px;
  top: 24px;
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, #FF5F01 0%, #f59e0b 100%);
  border-radius: 50%;
  box-shadow:
      0 0 0 3px white,
      0 2px 8px rgba(255, 95, 1, 0.4),
      0 0 0 0 rgba(255, 95, 1, 0.4);
  animation: pulse-indicator 2s infinite;
}

@keyframes pulse-indicator {
  0%, 100% {
    box-shadow:
        0 0 0 3px white,
        0 2px 8px rgba(255, 95, 1, 0.4),
        0 0 0 0 rgba(255, 95, 1, 0.4);
  }
  50% {
    box-shadow:
        0 0 0 3px white,
        0 2px 8px rgba(255, 95, 1, 0.4),
        0 0 0 6px rgba(255, 95, 1, 0);
  }
}

.notification-item.critical .unread-indicator {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  box-shadow:
      0 0 0 3px white,
      0 2px 8px rgba(220, 38, 38, 0.4),
      0 0 0 0 rgba(220, 38, 38, 0.4);
}

.notification-item.high .unread-indicator {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  box-shadow:
      0 0 0 3px white,
      0 2px 8px rgba(245, 158, 11, 0.4),
      0 0 0 0 rgba(245, 158, 11, 0.4);
}

.loading-more,
.no-more-items {
  padding: 24px;
  text-align: center;
  font-size: 0.9rem;
  color: #6b7280;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.loading-more i {
  color: #FF5F01;
  animation: spin 1s linear infinite;
}

.no-more-items {
  color: #059669;
}

.no-more-items i {
  color: #10b981;
}

.notification-preferences {
  border-top: 1px solid rgba(229, 231, 235, 0.8);
  max-height: 320px;
  overflow-y: auto;
  background: linear-gradient(135deg, rgba(250, 251, 252, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%);
  backdrop-filter: blur(10px);
}

/* ================================================================
   ANIMACIONES AVANZADAS
   ================================================================ */

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.notification-item {
  animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.notification-item:nth-child(even) {
  animation-delay: 0.1s;
}

.notification-item:nth-child(odd) {
  animation-delay: 0.05s;
}

/* ================================================================
   RESPONSIVE DESIGN MEJORADO
   ================================================================ */

@media (max-width: 768px) {
  .notification-bell {
    padding: 10px;
    font-size: 1.2rem;
  }

  .notification-dropdown {
    width: 380px;
    right: -70px;
    max-height: 550px;
  }

  .notification-header {
    padding: 20px 24px 16px;
  }

  .notification-header h3 {
    font-size: 1.2rem;
  }

  .notification-item {
    padding: 16px 24px;
  }

  .notification-summary {
    padding: 16px 24px;
  }

  .notification-filters {
    padding: 16px 24px;
  }
}

@media (max-width: 480px) {
  .notification-bell {
    padding: 8px;
    font-size: 1.1rem;
  }

  .notification-dropdown {
    width: 340px;
    right: -90px;
    max-height: 500px;
    border-radius: 20px;
  }

  .notification-header {
    padding: 18px 20px 14px;
  }

  .notification-header h3 {
    font-size: 1.1rem;
  }

  .notification-item {
    padding: 14px 20px;
  }

  .notification-summary {
    padding: 14px 20px;
  }

  .notification-filters {
    padding: 14px 20px;
  }

  .btn-mark-all,
  .btn-filters,
  .btn-settings {
    padding: 8px 12px;
    font-size: 0.8rem;
  }

  .notification-actions {
    flex-direction: column;
    gap: 6px;
  }

  .btn-mark-read,
  .btn-action {
    padding: 8px 10px;
    font-size: 0.8rem;
  }
}

/* ================================================================
   ACCESIBILIDAD MEJORADA
   ================================================================ */

.notification-bell:focus,
.btn-mark-all:focus,
.btn-filters:focus,
.btn-settings:focus,
.btn-mark-read:focus,
.btn-action:focus {
  outline: 3px solid rgba(255, 95, 1, 0.5);
  outline-offset: 3px;
}

.notification-item:focus {
  outline: 2px solid rgba(255, 95, 1, 0.4);
  outline-offset: 2px;
}

/* ================================================================
   ESTADOS ESPECIALES
   ================================================================ */

.notification-bell:active {
  transform: translateY(0) scale(1.02);
}

.btn-mark-all:active,
.btn-filters:active,
.btn-settings:active {
  transform: translateY(-1px) scale(0.98);
}

.notification-item:active {
  transform: translateX(4px) scale(0.99);
}


/* ================================================================
   MOTION REDUCIDO
   ================================================================ */

@media (prefers-reduced-motion: reduce) {
  .notification-bell,
  .notification-dropdown,
  .btn-mark-all,
  .btn-filters,
  .btn-settings,
  .notification-item,
  .btn-mark-read,
  .btn-action,
  .summary-item {
    transition: none;
    animation: none;
  }

  .notification-badge,
  .unread-indicator {
    animation: none;
  }

  .notification-dropdown::before {
    animation: none;
  }
}

/* ================================================================
   SOPORTE PARA MODO OSCURO PREPARADO
   ================================================================ */

.notification-bell,
.notification-dropdown,
.notification-item,
.btn-mark-all,
.btn-filters,
.btn-settings {
  backdrop-filter: blur(15px) saturate(180%);
  -webkit-backdrop-filter: blur(15px) saturate(180%);
}

/* ================================================================
   MEJORAS DE PERFORMANCE
   ================================================================ */

.notification-dropdown {
  will-change: transform, opacity;
}

.notification-item {
  will-change: transform;
}

.notification-bell {
  will-change: transform;
}

/* ================================================================
   ESTILOS PARA IMPRESIÓN
   ================================================================ */

@media print {
  .notification-bell,
  .notification-dropdown {
    background: white;
    box-shadow: none;
    border: 1px solid #000;
  }

  .notification-item {
    background: white;
    border-bottom: 1px solid #ccc;
  }

  .btn-mark-all,
  .btn-filters,
  .btn-settings,
  .btn-mark-read,
  .btn-action {
    background: white;
    color: #000;
    border: 1px solid #000;
  }
}
</style>