<script>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import NotificationItem from './NotificationItem.vue';
import NotificationFilters from './NotificationFilters.vue';
import NotificationPreferences from './NotificationPreferences.vue';

export default {
  name: 'NotificationDropdown',
  components: {
    NotificationItem,
    NotificationFilters,
    NotificationPreferences
  },
  props: {
    // Visibility
    visible: {
      type: Boolean,
      default: true
    },

    // Data
    notifications: {
      type: Array,
      default: () => []
    },
    summary: {
      type: Object,
      default: () => ({})
    },
    availableProjects: {
      type: Array,
      default: () => []
    },

    // Loading states
    loading: {
      type: Boolean,
      default: false
    },
    refreshing: {
      type: Boolean,
      default: false
    },
    hasMore: {
      type: Boolean,
      default: false
    },
    lastUpdated: {
      type: Date,
      default: null
    },

    // UI Configuration
    title: {
      type: String,
      default: ''
    },
    compact: {
      type: Boolean,
      default: false
    },
    resizable: {
      type: Boolean,
      default: false
    },
    maxHeight: {
      type: String,
      default: '500px'
    },
    width: {
      type: String,
      default: '380px'
    },

    // Feature toggles
    showMarkAllRead: {
      type: Boolean,
      default: true
    },
    showFilters: {
      type: Boolean,
      default: true
    },
    showPreferences: {
      type: Boolean,
      default: true
    },
    showRefresh: {
      type: Boolean,
      default: true
    },
    showClose: {
      type: Boolean,
      default: false
    },
    showSummary: {
      type: Boolean,
      default: true
    },
    showFooter: {
      type: Boolean,
      default: true
    },
    showViewAll: {
      type: Boolean,
      default: false
    },
    showClearOld: {
      type: Boolean,
      default: false
    },
    showEmptyActions: {
      type: Boolean,
      default: true
    },

    // Item configuration
    showActionButtons: {
      type: Boolean,
      default: true
    },
    showActionPreviews: {
      type: Boolean,
      default: false
    },
    hideMarkReadButtons: {
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
    itemsClickable: {
      type: Boolean,
      default: true
    },

    // Filters
    activeFilters: {
      type: Object,
      default: () => ({})
    }
  },
  emits: [
    'close',
    'refresh',
    'load-more',
    'mark-all-read',
    'mark-as-read',
    'notification-click',
    'notification-action',
    'archive',
    'delete',
    'filters-changed',
    'search',
    'preferences-updated',
    'view-all',
    'clear-old'
  ],
  setup(props, { emit }) {
    const router = useRouter();

    // State
    const filtersVisible = ref(false);
    const preferencesVisible = ref(false);
    const dropdownContent = ref(null);
    const isResizing = ref(false);
    const resizeStartY = ref(0);
    const resizeStartHeight = ref(0);

    // Computed
    const activeFiltersCount = computed(() => {
      return Object.keys(props.activeFilters).filter(key =>
          props.activeFilters[key] !== '' &&
          props.activeFilters[key] !== null &&
          props.activeFilters[key] !== undefined
      ).length;
    });

    // Methods
    const handleClickOutside = () => {
      if (props.visible) {
        emit('close');
      }
    };

    const handleClose = () => {
      emit('close');
    };

    const handleRefresh = () => {
      emit('refresh');
    };

    const loadMore = () => {
      emit('load-more');
    };

    const handleMarkAllAsRead = () => {
      emit('mark-all-read');
    };

    const handleMarkAsRead = (notificationId) => {
      emit('mark-as-read', notificationId);
    };

    const handleNotificationClick = (notification) => {
      emit('notification-click', notification);
    };

    const handleNotificationAction = (notification) => {
      emit('notification-action', notification);
    };

    const handleArchive = (notificationId) => {
      emit('archive', notificationId);
    };

    const handleDelete = (notificationId) => {
      emit('delete', notificationId);
    };

    const toggleFilters = () => {
      filtersVisible.value = !filtersVisible.value;
      if (filtersVisible.value) {
        preferencesVisible.value = false;
      }
    };

    const togglePreferences = () => {
      preferencesVisible.value = !preferencesVisible.value;
      if (preferencesVisible.value) {
        filtersVisible.value = false;
      }
    };

    const handleFiltersChanged = (filters) => {
      emit('filters-changed', filters);
    };

    const handleSearch = (query) => {
      emit('search', query);
    };

    const handlePreferencesUpdated = () => {
      emit('preferences-updated');
    };

    const filterByContext = (context) => {
      handleFiltersChanged({ context });
      filtersVisible.value = true;
    };

    const handleViewAll = () => {
      emit('view-all');
    };

    const handleClearOld = () => {
      emit('clear-old');
    };

    const handleScroll = (event) => {
      const { target } = event;
      const { scrollTop, scrollHeight, clientHeight } = target;

      // Auto load more when near bottom
      if (scrollTop + clientHeight >= scrollHeight - 100 && props.hasMore && !props.loading) {
        loadMore();
      }
    };

    const formatLastUpdated = (date) => {
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Ahora';
      if (diffMins < 60) return `${diffMins}m`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h`;
      return date.toLocaleDateString();
    };

    // Resize functionality
    const startResize = (event) => {
      isResizing.value = true;
      resizeStartY.value = event.clientY;
      resizeStartHeight.value = dropdownContent.value?.offsetHeight || 300;

      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
      document.body.style.userSelect = 'none';
    };

    const handleResize = (event) => {
      if (!isResizing.value) return;

      const deltaY = event.clientY - resizeStartY.value;
      const newHeight = Math.max(200, Math.min(600, resizeStartHeight.value + deltaY));

      if (dropdownContent.value) {
        dropdownContent.value.style.height = `${newHeight}px`;
      }
    };

    const stopResize = () => {
      isResizing.value = false;
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
      document.body.style.userSelect = '';
    };

    // Watchers
    watch(() => props.visible, (newVisible) => {
      if (newVisible) {
        nextTick(() => {
          // Auto-scroll to top when opened
          if (dropdownContent.value) {
            dropdownContent.value.scrollTop = 0;
          }
        });
      } else {
        // Close sub-panels when dropdown closes
        filtersVisible.value = false;
        preferencesVisible.value = false;
      }
    });

    // Click outside directive
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

    // Lifecycle
    onMounted(() => {
      // Set initial height if resizable
      if (props.resizable && dropdownContent.value) {
        dropdownContent.value.style.height = props.maxHeight;
      }
    });

    onUnmounted(() => {
      // Clean up resize listeners
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
    });

    return {
      // State
      filtersVisible,
      preferencesVisible,
      dropdownContent,

      // Computed
      activeFiltersCount,

      // Methods
      handleClickOutside,
      handleClose,
      handleRefresh,
      loadMore,
      handleMarkAllAsRead,
      handleMarkAsRead,
      handleNotificationClick,
      handleNotificationAction,
      handleArchive,
      handleDelete,
      toggleFilters,
      togglePreferences,
      handleFiltersChanged,
      handleSearch,
      handlePreferencesUpdated,
      filterByContext,
      handleViewAll,
      handleClearOld,
      handleScroll,
      formatLastUpdated,
      startResize,

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
      class="notification-dropdown"
      :class="{
      'dropdown-visible': visible,
      'dropdown-loading': loading,
      'dropdown-compact': compact
    }"
      v-click-outside="handleClickOutside"
  >
    <!-- Header -->
    <div class="dropdown-header">
      <div class="header-title">
        <h3>{{ title || $t('notifications.title') }}</h3>
        <span v-if="summary.hasUnread" class="unread-count">
          {{ summary.displayCount }}
        </span>
      </div>

      <div class="header-actions">
        <!-- Mark All as Read -->
        <button
            v-if="summary.hasUnread && showMarkAllRead"
            @click="handleMarkAllAsRead"
            class="btn-mark-all"
            :disabled="loading"
            :title="$t('notifications.markAllRead')"
        >
          <i class="pi pi-check"></i>
          <span v-if="!compact">{{ $t('notifications.markAllRead') }}</span>
        </button>

        <!-- Filters Toggle -->
        <button
            v-if="showFilters"
            @click="toggleFilters"
            class="btn-filters"
            :class="{ active: filtersVisible }"
            :title="$t('notifications.filters.title')"
        >
          <i class="pi pi-filter"></i>
          <span v-if="activeFiltersCount > 0" class="filter-badge">{{ activeFiltersCount }}</span>
        </button>

        <!-- Preferences -->
        <button
            v-if="showPreferences"
            @click="togglePreferences"
            class="btn-preferences"
            :class="{ active: preferencesVisible }"
            :title="$t('notifications.preferences.title')"
        >
          <i class="pi pi-cog"></i>
        </button>

        <!-- Refresh -->
        <button
            v-if="showRefresh"
            @click="handleRefresh"
            class="btn-refresh"
            :class="{ spinning: refreshing }"
            :title="$t('notifications.refresh')"
        >
          <i class="pi pi-refresh"></i>
        </button>

        <!-- Close -->
        <button
            v-if="showClose"
            @click="handleClose"
            class="btn-close"
            :title="$t('notifications.close')"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>
    </div>

    <!-- Summary Stats (when collapsed) -->
    <div v-if="showSummary && summary.hasUnread && !filtersVisible" class="dropdown-summary">
      <div class="summary-stats">
        <div
            v-for="contextStat in summary.contextSummary.slice(0, 3)"
            :key="contextStat.context"
            class="summary-stat"
            @click="filterByContext(contextStat.context)"
        >
          <i :class="contextStat.icon"></i>
          <span class="stat-label">{{ contextStat.displayName }}</span>
          <span class="stat-count">{{ contextStat.count }}</span>
        </div>

        <div v-if="summary.contextSummary.length > 3" class="summary-more">
          <span>+{{ summary.contextSummary.length - 3 }} más</span>
        </div>
      </div>

      <!-- Priority Summary -->
      <div v-if="summary.hasCritical || summary.hasHigh" class="priority-summary">
        <div v-if="summary.hasCritical" class="priority-item critical">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ summary.criticalCount }} {{ $t('notifications.priorities.critical') }}</span>
        </div>
        <div v-if="summary.hasHigh" class="priority-item high">
          <i class="pi pi-exclamation"></i>
          <span>{{ summary.highCount }} {{ $t('notifications.priorities.high') }}</span>
        </div>
      </div>
    </div>

    <!-- Filters Panel -->
    <div v-if="filtersVisible && showFilters" class="dropdown-filters">
      <NotificationFilters
          :notification-summary="summary"
          :available-projects="availableProjects"
          :total-results="notifications.length"
          :show-saved-filters="true"
          @filters-changed="handleFiltersChanged"
          @search="handleSearch"
      />
    </div>

    <!-- Notifications List -->
    <div class="dropdown-content" ref="dropdownContent" @scroll="handleScroll">
      <!-- Loading State -->
      <div v-if="loading && notifications.length === 0" class="loading-state">
        <div class="loading-spinner">
          <i class="pi pi-spin pi-spinner"></i>
        </div>
        <p>{{ $t('notifications.loading') }}</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="notifications.length === 0" class="empty-state">
        <div class="empty-icon">
          <i class="pi pi-inbox"></i>
        </div>
        <p class="empty-title">{{ $t('notifications.empty') }}</p>
        <p class="empty-subtitle">{{ $t('notifications.emptySubtitle') }}</p>

        <!-- Empty Actions -->
        <div v-if="showEmptyActions" class="empty-actions">
          <button @click="handleRefresh" class="btn-empty-action">
            <i class="pi pi-refresh"></i>
            {{ $t('notifications.refresh') }}
          </button>
          <button v-if="showPreferences" @click="togglePreferences" class="btn-empty-action">
            <i class="pi pi-cog"></i>
            {{ $t('notifications.preferences.title') }}
          </button>
        </div>
      </div>

      <!-- Notifications List -->
      <div v-else class="notifications-list">
        <NotificationItem
            v-for="notification in notifications"
            :key="notification.id"
            :notification="notification"
            :show-action-button="showActionButtons"
            :show-action-preview="showActionPreviews"
            :hide-mark-read="hideMarkReadButtons"
            :show-more-options="showMoreOptions"
            :allow-delete="allowDelete"
            :clickable="itemsClickable"
            @click="handleNotificationClick"
            @mark-as-read="handleMarkAsRead"
            @action="handleNotificationAction"
            @archive="handleArchive"
            @delete="handleDelete"
        />

        <!-- Load More -->
        <div v-if="hasMore && !loading" class="load-more">
          <button @click="loadMore" class="btn-load-more">
            {{ $t('notifications.loadMore') }}
          </button>
        </div>

        <!-- Loading More -->
        <div v-if="loading && notifications.length > 0" class="loading-more">
          <i class="pi pi-spin pi-spinner"></i>
          <span>{{ $t('notifications.loadingMore') }}</span>
        </div>

        <!-- No More Items -->
        <div v-if="!hasMore && notifications.length > 0" class="no-more-items">
          <i class="pi pi-check-circle"></i>
          <span>{{ $t('notifications.noMoreItems') }}</span>
        </div>
      </div>
    </div>

    <!-- Preferences Panel -->
    <div v-if="preferencesVisible && showPreferences" class="dropdown-preferences">
      <NotificationPreferences
          :notification-summary="summary"
          @close="togglePreferences"
          @updated="handlePreferencesUpdated"
      />
    </div>

    <!-- Footer -->
    <div v-if="showFooter" class="dropdown-footer">
      <div class="footer-stats">
        <span class="footer-total">
          {{ $t('notifications.total') }}: {{ notifications.length }}
          <span v-if="hasMore">+</span>
        </span>
        <span v-if="lastUpdated" class="footer-updated">
          {{ $t('notifications.lastUpdated') }}: {{ formatLastUpdated(lastUpdated) }}
        </span>
      </div>

      <!-- Footer Actions -->
      <div class="footer-actions">
        <button
            v-if="showViewAll"
            @click="handleViewAll"
            class="btn-view-all"
        >
          {{ $t('notifications.viewAll') }}
        </button>

        <button
            v-if="showClearOld"
            @click="handleClearOld"
            class="btn-clear-old"
        >
          {{ $t('notifications.clearOld') }}
        </button>
      </div>
    </div>

    <!-- Resize Handle (for resizable dropdown) -->
    <div v-if="resizable" class="resize-handle" @mousedown="startResize">
      <i class="pi pi-arrows-v"></i>
    </div>
  </div>
</template>
<style scoped>
/* ================================================================
   NOTIFICATION DROPDOWN - LIGHT MODE
   ================================================================ */

.notification-dropdown {
  background: white;
  border: 1px solid rgba(229, 231, 235, 0.8);
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  position: relative;
  max-height: v-bind(maxHeight);
  width: v-bind(width);
  overflow: hidden;
  backdrop-filter: blur(20px);
  animation: slideInDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.notification-dropdown.dropdown-compact {
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.notification-dropdown.dropdown-loading {
  opacity: 0.8;
  pointer-events: none;
}

.dropdown-header {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #fafafa 0%, #ffffff 100%);
}

.dropdown-compact .dropdown-header {
  padding: 16px 20px 12px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-title h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.025em;
}

.dropdown-compact .header-title h3 {
  font-size: 1.125rem;
}

.unread-count {
  background: linear-gradient(135deg, #FF5F01 0%, #e55a00 100%);
  color: white;
  border-radius: 16px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 24px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(255, 95, 1, 0.3);
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-mark-all,
.btn-filters,
.btn-preferences,
.btn-refresh,
.btn-close {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.dropdown-compact .btn-mark-all span,
.dropdown-compact .btn-filters span,
.dropdown-compact .btn-preferences span,
.dropdown-compact .btn-refresh span,
.dropdown-compact .btn-close span {
  display: none;
}

.btn-mark-all {
  color: #FF5F01;
  border-color: rgba(255, 95, 1, 0.3);
  background: rgba(255, 95, 1, 0.05);
}

.btn-mark-all:hover:not(:disabled) {
  background: #FF5F01;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 95, 1, 0.3);
}

.btn-mark-all:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-filters,
.btn-preferences {
  color: #6b7280;
}

.btn-filters.active,
.btn-preferences.active,
.btn-filters:hover,
.btn-preferences:hover {
  background: #f9fafb;
  color: #374151;
  border-color: #d1d5db;
  transform: translateY(-1px);
}

.btn-refresh {
  color: #059669;
  border-color: rgba(5, 150, 105, 0.3);
  background: rgba(5, 150, 105, 0.05);
}

.btn-refresh:hover {
  background: #059669;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
}

.btn-refresh.spinning i {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.btn-close {
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.3);
  background: rgba(220, 38, 38, 0.05);
}

.btn-close:hover {
  background: #dc2626;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.filter-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: linear-gradient(135deg, #FF5F01 0%, #e55a00 100%);
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(255, 95, 1, 0.3);
}

.dropdown-summary {
  padding: 16px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
}

.summary-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.summary-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  border-radius: 16px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.summary-stat:hover {
  border-color: #FF5F01;
  background: #fff8f5;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 95, 1, 0.15);
}

.stat-label {
  color: #64748b;
  font-weight: 500;
}

.stat-count {
  background: linear-gradient(135deg, #FF5F01 0%, #e55a00 100%);
  color: white;
  border-radius: 12px;
  padding: 2px 6px;
  font-weight: 700;
  min-width: 20px;
  text-align: center;
  font-size: 0.7rem;
  box-shadow: 0 1px 3px rgba(255, 95, 1, 0.3);
}

.summary-more {
  color: #94a3b8;
  font-size: 0.8rem;
  padding: 6px 12px;
  font-style: italic;
}

.priority-summary {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.priority-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.priority-item.critical {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  color: #dc2626;
  border: 1px solid rgba(220, 38, 38, 0.2);
}

.priority-item.high {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.dropdown-filters,
.dropdown-preferences {
  border-bottom: 1px solid #e5e7eb;
  max-height: 320px;
  overflow-y: auto;
  background: #fafbfc;
}

.dropdown-filters::-webkit-scrollbar,
.dropdown-preferences::-webkit-scrollbar {
  width: 6px;
}

.dropdown-filters::-webkit-scrollbar-track,
.dropdown-preferences::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.dropdown-filters::-webkit-scrollbar-thumb,
.dropdown-preferences::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.dropdown-content {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
}

.dropdown-content::-webkit-scrollbar {
  width: 6px;
}

.dropdown-content::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.dropdown-content::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.dropdown-content::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.loading-state,
.empty-state {
  padding: 48px 24px;
  text-align: center;
  color: #6b7280;
}

.loading-spinner {
  font-size: 2.5rem;
  margin-bottom: 20px;
  color: #FF5F01;
  animation: spin 1s linear infinite;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  color: #d1d5db;
}

.empty-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #111827;
}

.empty-subtitle {
  margin: 0 0 20px 0;
  color: #6b7280;
  font-size: 1rem;
  line-height: 1.5;
}

.empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-empty-action {
  padding: 10px 20px;
  border: 1px solid #FF5F01;
  background: white;
  color: #FF5F01;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-empty-action:hover {
  background: #FF5F01;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 95, 1, 0.3);
}

.notifications-list {
  min-height: 0;
}

.load-more {
  padding: 20px;
  text-align: center;
}

.btn-load-more {
  padding: 10px 20px;
  border: 1px solid #FF5F01;
  background: white;
  color: #FF5F01;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-load-more:hover {
  background: #FF5F01;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 95, 1, 0.3);
}

.loading-more,
.no-more-items {
  padding: 20px;
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: 500;
}

.no-more-items {
  color: #059669;
}

.no-more-items i {
  color: #10b981;
}

.dropdown-footer {
  padding: 16px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: #6b7280;
}

.footer-total {
  font-weight: 600;
  color: #374151;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

.btn-view-all,
.btn-clear-old {
  padding: 6px 12px;
  border: 1px solid #6b7280;
  background: white;
  color: #6b7280;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-view-all:hover,
.btn-clear-old:hover {
  background: #6b7280;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(107, 114, 128, 0.3);
}

.resize-handle {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 14px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-top: 1px solid #e5e7eb;
  cursor: ns-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.resize-handle:hover {
  background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
  color: #6b7280;
}

/* ================================================================
   ANIMATIONS
   ================================================================ */

@keyframes slideInDown {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

.summary-stat.new {
  animation: pulse 0.6s ease-out;
}

/* ================================================================
   RESPONSIVE DESIGN
   ================================================================ */

@media (max-width: 768px) {
  .notification-dropdown {
    width: 360px;
    max-height: 500px;
  }

  .dropdown-header {
    padding: 16px 20px 12px;
  }

  .header-title h3 {
    font-size: 1.125rem;
  }

  .summary-stats {
    gap: 8px;
  }

  .summary-stat {
    font-size: 0.75rem;
    padding: 4px 8px;
  }

  .priority-summary {
    gap: 6px;
  }

  .btn-mark-all,
  .btn-filters,
  .btn-preferences,
  .btn-refresh,
  .btn-close {
    padding: 6px 8px;
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .notification-dropdown {
    width: 320px;
    max-height: 450px;
  }

  .dropdown-header {
    padding: 14px 16px 10px;
  }

  .header-title {
    gap: 8px;
  }

  .header-title h3 {
    font-size: 1rem;
  }

  .dropdown-summary {
    padding: 12px 16px;
  }

  .dropdown-footer {
    padding: 12px 16px;
  }

  .summary-stats {
    flex-direction: column;
    gap: 6px;
  }

  .summary-stat {
    justify-content: space-between;
    width: 100%;
  }

  .empty-actions {
    flex-direction: column;
  }

  .btn-empty-action {
    width: 100%;
    justify-content: center;
  }
}

/* ================================================================
   ACCESSIBILITY
   ================================================================ */

.btn-mark-all:focus,
.btn-filters:focus,
.btn-preferences:focus,
.btn-refresh:focus,
.btn-close:focus,
.btn-load-more:focus,
.btn-empty-action:focus {
  outline: 2px solid #FF5F01;
  outline-offset: 2px;
}

.summary-stat:focus {
  outline: 2px solid #FF5F01;
  outline-offset: 2px;
}

/* ================================================================
   DARK MODE SUPPORT READY
   ================================================================ */

@media (prefers-reduced-motion: reduce) {
  .notification-dropdown {
    animation: none;
  }

  .btn-mark-all,
  .btn-filters,
  .btn-preferences,
  .btn-refresh,
  .btn-close,
  .btn-load-more,
  .btn-empty-action,
  .summary-stat {
    transition: none;
  }

  .loading-spinner,
  .btn-refresh.spinning i {
    animation: none;
  }
}
</style>