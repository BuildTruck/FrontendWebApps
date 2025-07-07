<script>
import { ref, computed, watch, onMounted } from 'vue';
import { AuthService} from "../../../auth/services/auth-api.service.js";

export default {
  name: 'NotificationFilters',
  props: {
    notificationSummary: {
      type: Object,
      default: () => ({})
    },
    availableProjects: {
      type: Array,
      default: () => []
    },
    totalResults: {
      type: Number,
      default: 0
    },
    showSavedFilters: {
      type: Boolean,
      default: false
    }
  },
  emits: ['filtersChanged', 'search'],
  setup(props, { emit }) {
    // State
    const showAdvanced = ref(false);
    const quickFilter = ref('');
    const searchQuery = ref('');
    const selectedContext = ref('');
    const selectedPriority = ref('');
    const selectedProject = ref('');
    const readStatus = ref('');
    const hasAction = ref('');
    const dateFrom = ref('');
    const dateTo = ref('');
    const sortBy = ref('createdAt');
    const sortOrder = ref('desc');
    const searchTimeout = ref(null);

    // Data
    const user = ref(AuthService.getCurrentUser());
    const savedFilters = ref([]);

    // Computed
    const availableContexts = computed(() => {
      const contexts = ['SYSTEM', 'PROJECTS', 'PERSONNEL', 'MATERIALS', 'MACHINERY', 'INCIDENTS'];
      const userContexts = getUserAvailableContexts();

      return contexts
          .filter(context => userContexts.includes(context))
          .map(context => ({
            value: context,
            label: getContextLabel(context),
            count: props.notificationSummary?.byContext?.[context] || 0
          }));
    });

    const canFilterByProject = computed(() => {
      return user.value?.role === 'Admin' || user.value?.role === 'Manager';
    });

    const unreadCount = computed(() => {
      return props.notificationSummary?.unreadCount || 0;
    });

    const criticalCount = computed(() => {
      return props.notificationSummary?.byPriority?.CRITICAL || 0;
    });

    const hasActiveFilters = computed(() => {
      return searchQuery.value ||
          selectedContext.value ||
          selectedPriority.value ||
          selectedProject.value ||
          readStatus.value ||
          hasAction.value ||
          dateFrom.value ||
          dateTo.value ||
          quickFilter.value;
    });

    const resultsInfo = computed(() => {
      if (!hasActiveFilters.value) return '';

      const count = props.totalResults;
      if (count === 0) {
        return 'No se encontraron notificaciones con los filtros aplicados';
      } else if (count === 1) {
        return '1 notificación encontrada';
      } else {
        return `${count} notificaciones encontradas`;
      }
    });

    // Methods
    const getUserAvailableContexts = () => {
      switch (user.value?.role) {
        case 'Admin':
          return ['SYSTEM', 'PROJECTS', 'PERSONNEL', 'MATERIALS', 'MACHINERY', 'INCIDENTS'];
        case 'Manager':
          return ['PROJECTS', 'PERSONNEL', 'MATERIALS', 'MACHINERY', 'INCIDENTS'];
        case 'Supervisor':
          return ['PERSONNEL', 'MATERIALS', 'MACHINERY', 'INCIDENTS'];
        default:
          return ['SYSTEM', 'PROJECTS', 'PERSONNEL', 'MATERIALS', 'MACHINERY', 'INCIDENTS'];
      }
    };

    const getContextLabel = (context) => {
      const labels = {
        'SYSTEM': 'Sistema',
        'PROJECTS': 'Proyectos',
        'PERSONNEL': 'Personal',
        'MATERIALS': 'Materiales',
        'MACHINERY': 'Maquinaria',
        'INCIDENTS': 'Incidentes'
      };
      return labels[context] || context;
    };

    const setQuickFilter = (filter) => {
      // Toggle quick filter
      if (quickFilter.value === filter) {
        quickFilter.value = '';
        clearAllFilters();
      } else {
        quickFilter.value = filter;
        applyQuickFilter(filter);
      }
    };

    const applyQuickFilter = (filter) => {
      // Clear other filters first
      clearFiltersExceptQuick();

      switch (filter) {
        case 'unread':
          readStatus.value = 'unread';
          break;
        case 'critical':
          selectedPriority.value = 'CRITICAL';
          break;
        case 'today':
          const today = new Date().toISOString().split('T')[0];
          dateFrom.value = today;
          dateTo.value = today;
          break;
        case 'actions':
          hasAction.value = 'true';
          break;
      }

      applyFilters();
    };

    const clearFiltersExceptQuick = () => {
      selectedContext.value = '';
      selectedPriority.value = '';
      selectedProject.value = '';
      readStatus.value = '';
      hasAction.value = '';
      dateFrom.value = '';
      dateTo.value = '';
      searchQuery.value = '';
    };

    const clearAllFilters = () => {
      quickFilter.value = '';
      clearFiltersExceptQuick();
      applyFilters();
    };

    const clearSearch = () => {
      searchQuery.value = '';
      onSearchInput();
    };

    const clearDateRange = () => {
      dateFrom.value = '';
      dateTo.value = '';
      applyFilters();
    };

    const toggleAdvanced = () => {
      showAdvanced.value = !showAdvanced.value;
    };

    const toggleSortOrder = () => {
      sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc';
      applyFilters();
    };

    const onSearchInput = () => {
      // Debounce search
      if (searchTimeout.value) {
        clearTimeout(searchTimeout.value);
      }

      searchTimeout.value = setTimeout(() => {
        emit('search', searchQuery.value);
      }, 300);
    };

    const applyFilters = () => {
      const filters = {
        search: searchQuery.value,
        context: selectedContext.value,
        priority: selectedPriority.value,
        project: selectedProject.value,
        readStatus: readStatus.value,
        hasAction: hasAction.value === 'true' ? true : hasAction.value === 'false' ? false : undefined,
        dateFrom: dateFrom.value,
        dateTo: dateTo.value,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value
      };

      // Remove empty filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === '' || filters[key] === undefined) {
          delete filters[key];
        }
      });

      emit('filtersChanged', filters);
    };

    const formatDateRange = () => {
      if (dateFrom.value && dateTo.value) {
        return `${dateFrom.value} - ${dateTo.value}`;
      } else if (dateFrom.value) {
        return `Desde ${dateFrom.value}`;
      } else if (dateTo.value) {
        return `Hasta ${dateTo.value}`;
      }
      return '';
    };

    // Saved Filters
    const loadSavedFilters = () => {
      const saved = localStorage.getItem(`notificationFilters_${user.value?.id}`);
      if (saved) {
        try {
          savedFilters.value = JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing saved filters:', e);
        }
      }
    };

    const saveSavedFilters = () => {
      localStorage.setItem(`notificationFilters_${user.value?.id}`, JSON.stringify(savedFilters.value));
    };

    const saveCurrentFilter = () => {
      const name = prompt('Nombre para este filtro:');
      if (!name) return;

      const filter = {
        id: Date.now(),
        name,
        filters: {
          search: searchQuery.value,
          context: selectedContext.value,
          priority: selectedPriority.value,
          project: selectedProject.value,
          readStatus: readStatus.value,
          hasAction: hasAction.value,
          dateFrom: dateFrom.value,
          dateTo: dateTo.value,
          sortBy: sortBy.value,
          sortOrder: sortOrder.value
        }
      };

      savedFilters.value.push(filter);
      saveSavedFilters();
    };

    const applySavedFilter = (savedFilter) => {
      const filters = savedFilter.filters;

      searchQuery.value = filters.search || '';
      selectedContext.value = filters.context || '';
      selectedPriority.value = filters.priority || '';
      selectedProject.value = filters.project || '';
      readStatus.value = filters.readStatus || '';
      hasAction.value = filters.hasAction || '';
      dateFrom.value = filters.dateFrom || '';
      dateTo.value = filters.dateTo || '';
      sortBy.value = filters.sortBy || 'createdAt';
      sortOrder.value = filters.sortOrder || 'desc';

      quickFilter.value = '';
      applyFilters();
    };

    const deleteSavedFilter = (filterId) => {
      savedFilters.value = savedFilters.value.filter(f => f.id !== filterId);
      saveSavedFilters();
    };

    // Watchers
    watch([selectedContext, selectedPriority, selectedProject, readStatus, hasAction, dateFrom, dateTo, sortBy], () => {
      // Clear quick filter when manual filters change
      if (quickFilter.value) {
        quickFilter.value = '';
      }
    });

    // Lifecycle
    onMounted(() => {
      if (props.showSavedFilters) {
        loadSavedFilters();
      }
    });

    return {
      // State
      showAdvanced,
      quickFilter,
      searchQuery,
      selectedContext,
      selectedPriority,
      selectedProject,
      readStatus,
      hasAction,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
      savedFilters,

      // Computed
      availableContexts,
      canFilterByProject,
      unreadCount,
      criticalCount,
      hasActiveFilters,
      resultsInfo,

      // Methods
      setQuickFilter,
      clearAllFilters,
      clearSearch,
      clearDateRange,
      toggleAdvanced,
      toggleSortOrder,
      onSearchInput,
      applyFilters,
      formatDateRange,
      getContextLabel,
      saveCurrentFilter,
      applySavedFilter,
      deleteSavedFilter
    };
  }
};
</script>

<template>
  <div class="notification-filters">
    <!-- Filter Header -->
    <div class="filters-header">
      <h5>{{ $t('notifications.filters.title') }}</h5>
      <div class="header-actions">
        <button
            @click="clearAllFilters"
            class="btn-clear"
            :disabled="!hasActiveFilters"
        >
          {{ $t('notifications.filters.clearAll') }}
        </button>
        <button @click="toggleAdvanced" class="btn-advanced" :class="{ active: showAdvanced }">
          <i class="pi pi-sliders-h"></i>
        </button>
      </div>
    </div>

    <!-- Quick Filters -->
    <div class="quick-filters">
      <button
          @click="setQuickFilter('unread')"
          class="filter-chip"
          :class="{ active: quickFilter === 'unread' }"
      >
        <i class="pi pi-circle"></i>
        {{ $t('notifications.filters.unreadOnly') }}
        <span v-if="unreadCount > 0" class="filter-count">{{ unreadCount }}</span>
      </button>

      <button
          @click="setQuickFilter('critical')"
          class="filter-chip critical"
          :class="{ active: quickFilter === 'critical' }"
      >
        <i class="pi pi-exclamation-triangle"></i>
        {{ $t('notifications.filters.critical') }}
        <span v-if="criticalCount > 0" class="filter-count">{{ criticalCount }}</span>
      </button>

      <button
          @click="setQuickFilter('today')"
          class="filter-chip"
          :class="{ active: quickFilter === 'today' }"
      >
        <i class="pi pi-calendar"></i>
        {{ $t('notifications.filters.today') }}
      </button>

      <button
          @click="setQuickFilter('actions')"
          class="filter-chip"
          :class="{ active: quickFilter === 'actions' }"
      >
        <i class="pi pi-external-link"></i>
        {{ $t('notifications.filters.withActions') }}
      </button>
    </div>

    <!-- Basic Filters -->
    <div class="basic-filters">
      <!-- Search -->
      <div class="filter-group">
        <label class="filter-label">
          <i class="pi pi-search"></i>
          {{ $t('notifications.filters.search') }}
        </label>
        <input
            type="text"
            v-model="searchQuery"
            @input="onSearchInput"
            :placeholder="$t('notifications.filters.searchPlaceholder')"
            class="filter-input"
        >
        <button
            v-if="searchQuery"
            @click="clearSearch"
            class="btn-clear-input"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>

      <!-- Context Filter -->
      <div class="filter-group">
        <label class="filter-label">
          <i class="pi pi-tag"></i>
          {{ $t('notifications.filters.context') }}
        </label>
        <select v-model="selectedContext" @change="applyFilters" class="filter-select">
          <option value="">{{ $t('notifications.filters.allContexts') }}</option>
          <option
              v-for="context in availableContexts"
              :key="context.value"
              :value="context.value"
          >
            {{ context.label }}
            <span v-if="context.count > 0">({{ context.count }})</span>
          </option>
        </select>
      </div>

      <!-- Priority Filter -->
      <div class="filter-group">
        <label class="filter-label">
          <i class="pi pi-flag"></i>
          {{ $t('notifications.filters.priority') }}
        </label>
        <select v-model="selectedPriority" @change="applyFilters" class="filter-select">
          <option value="">{{ $t('notifications.filters.allPriorities') }}</option>
          <option value="CRITICAL">{{ $t('notifications.priorities.critical') }}</option>
          <option value="HIGH">{{ $t('notifications.priorities.high') }}</option>
          <option value="NORMAL">{{ $t('notifications.priorities.normal') }}</option>
          <option value="LOW">{{ $t('notifications.priorities.low') }}</option>
        </select>
      </div>
    </div>

    <!-- Advanced Filters -->
    <div v-if="showAdvanced" class="advanced-filters">
      <!-- Date Range -->
      <div class="filter-group">
        <label class="filter-label">
          <i class="pi pi-calendar-plus"></i>
          {{ $t('notifications.filters.dateRange') }}
        </label>
        <div class="date-range">
          <input
              type="date"
              v-model="dateFrom"
              @change="applyFilters"
              class="filter-date"
          >
          <span class="date-separator">-</span>
          <input
              type="date"
              v-model="dateTo"
              @change="applyFilters"
              class="filter-date"
          >
        </div>
      </div>

      <!-- Project Filter (for managers/supervisors) -->
      <div v-if="canFilterByProject" class="filter-group">
        <label class="filter-label">
          <i class="pi pi-home"></i>
          {{ $t('notifications.filters.project') }}
        </label>
        <select v-model="selectedProject" @change="applyFilters" class="filter-select">
          <option value="">{{ $t('notifications.filters.allProjects') }}</option>
          <option
              v-for="project in availableProjects"
              :key="project.id"
              :value="project.id"
          >
            {{ project.name }}
          </option>
        </select>
      </div>

      <!-- Read Status -->
      <div class="filter-group">
        <label class="filter-label">
          <i class="pi pi-eye"></i>
          {{ $t('notifications.filters.readStatus') }}
        </label>
        <select v-model="readStatus" @change="applyFilters" class="filter-select">
          <option value="">{{ $t('notifications.filters.all') }}</option>
          <option value="unread">{{ $t('notifications.filters.unreadOnly') }}</option>
          <option value="read">{{ $t('notifications.filters.readOnly') }}</option>
        </select>
      </div>

      <!-- Has Action -->
      <div class="filter-group">
        <label class="filter-label">
          <i class="pi pi-link"></i>
          {{ $t('notifications.filters.hasAction') }}
        </label>
        <select v-model="hasAction" @change="applyFilters" class="filter-select">
          <option value="">{{ $t('notifications.filters.all') }}</option>
          <option value="true">{{ $t('notifications.filters.withActions') }}</option>
          <option value="false">{{ $t('notifications.filters.withoutActions') }}</option>
        </select>
      </div>

      <!-- Sort Options -->
      <div class="filter-group">
        <label class="filter-label">
          <i class="pi pi-sort"></i>
          {{ $t('notifications.filters.sortBy') }}
        </label>
        <div class="sort-controls">
          <select v-model="sortBy" @change="applyFilters" class="filter-select">
            <option value="createdAt">{{ $t('notifications.filters.sortByDate') }}</option>
            <option value="priority">{{ $t('notifications.filters.sortByPriority') }}</option>
            <option value="context">{{ $t('notifications.filters.sortByContext') }}</option>
            <option value="readStatus">{{ $t('notifications.filters.sortByStatus') }}</option>
          </select>
          <button
              @click="toggleSortOrder"
              class="btn-sort-order"
              :title="sortOrder === 'desc' ? $t('notifications.filters.descending') : $t('notifications.filters.ascending')"
          >
            <i :class="sortOrder === 'desc' ? 'pi pi-sort-amount-down' : 'pi pi-sort-amount-up'"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Active Filters Summary -->
    <div v-if="hasActiveFilters" class="active-filters">
      <div class="active-filters-header">
        <span>{{ $t('notifications.filters.activeFilters') }}:</span>
        <button @click="clearAllFilters" class="btn-clear-small">
          {{ $t('notifications.filters.clearAll') }}
        </button>
      </div>
      <div class="active-filter-tags">
        <span v-if="searchQuery" class="filter-tag">
          {{ $t('notifications.filters.search') }}: "{{ searchQuery }}"
          <button @click="clearSearch" class="remove-filter">
            <i class="pi pi-times"></i>
          </button>
        </span>

        <span v-if="selectedContext" class="filter-tag">
          {{ $t('notifications.filters.context') }}: {{ getContextLabel(selectedContext) }}
          <button @click="selectedContext = ''; applyFilters()" class="remove-filter">
            <i class="pi pi-times"></i>
          </button>
        </span>

        <span v-if="selectedPriority" class="filter-tag">
          {{ $t('notifications.filters.priority') }}: {{ $t(`notifications.priorities.${selectedPriority.toLowerCase()}`) }}
          <button @click="selectedPriority = ''; applyFilters()" class="remove-filter">
            <i class="pi pi-times"></i>
          </button>
        </span>

        <span v-if="readStatus" class="filter-tag">
          {{ $t('notifications.filters.status') }}: {{ $t(`notifications.filters.${readStatus}Only`) }}
          <button @click="readStatus = ''; applyFilters()" class="remove-filter">
            <i class="pi pi-times"></i>
          </button>
        </span>

        <span v-if="dateFrom || dateTo" class="filter-tag">
          {{ $t('notifications.filters.dateRange') }}: {{ formatDateRange() }}
          <button @click="clearDateRange" class="remove-filter">
            <i class="pi pi-times"></i>
          </button>
        </span>
      </div>
    </div>

    <!-- Filter Results Info -->
    <div v-if="resultsInfo" class="results-info">
      <i class="pi pi-info-circle"></i>
      <span>{{ resultsInfo }}</span>
    </div>

    <!-- Saved Filters -->
    <div v-if="showSavedFilters" class="saved-filters">
      <div class="saved-filters-header">
        <span>{{ $t('notifications.filters.savedFilters') }}</span>
        <button @click="saveCurrentFilter" class="btn-save" :disabled="!hasActiveFilters">
          <i class="pi pi-bookmark"></i>
          {{ $t('notifications.filters.saveFilter') }}
        </button>
      </div>
      <div class="saved-filter-list">
        <button
            v-for="savedFilter in savedFilters"
            :key="savedFilter.id"
            @click="applySavedFilter(savedFilter)"
            class="saved-filter-item"
        >
          <span>{{ savedFilter.name }}</span>
          <button @click.stop="deleteSavedFilter(savedFilter.id)" class="btn-delete-saved">
            <i class="pi pi-trash"></i>
          </button>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ================================================================
   NOTIFICATION FILTERS - ULTRA MODERN LIGHT MODE
   ================================================================ */

.notification-filters {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%);
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: 20px;
  padding: 28px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.08),
      0 4px 16px rgba(0, 0, 0, 0.04),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
}

.notification-filters::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #FF5F01, #f59e0b, #10b981, #3b82f6, #8b5cf6);
  background-size: 300% 100%;
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.filters-header h5 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 800;
  background: linear-gradient(135deg, #111827 0%, #374151 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.025em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.filters-header h5::before {
  content: '⚡';
  font-size: 1.2rem;
  background: linear-gradient(135deg, #FF5F01, #f59e0b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.btn-clear,
.btn-clear-small {
  padding: 8px 16px;
  border: none;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  color: #dc2626;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.15);
  position: relative;
  overflow: hidden;
}

.btn-clear::before,
.btn-clear-small::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  transition: left 0.5s;
}

.btn-clear:hover:not(:disabled),
.btn-clear-small:hover {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4);
}

.btn-clear:hover::before,
.btn-clear-small:hover::before {
  left: 100%;
}

.btn-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-advanced {
  padding: 8px 12px;
  border: none;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: #475569;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(71, 85, 105, 0.15);
  position: relative;
  overflow: hidden;
}

.btn-advanced:hover,
.btn-advanced.active {
  background: linear-gradient(135deg, #475569 0%, #334155 100%);
  color: white;
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 8px 25px rgba(71, 85, 105, 0.4);
}

.quick-filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-chip {
  padding: 10px 18px;
  border: 2px solid transparent;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 25px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  position: relative;
  overflow: hidden;
}

.filter-chip::before {
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

.filter-chip:hover {
  border-color: rgba(255, 95, 1, 0.3);
  color: #FF5F01;
  transform: translateY(-3px) scale(1.05);
  box-shadow:
      0 8px 25px rgba(255, 95, 1, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.filter-chip:hover::before {
  opacity: 1;
}

.filter-chip.active {
  background: linear-gradient(135deg, #FF5F01 0%, #f59e0b 100%);
  border-color: #FF5F01;
  color: white;
  transform: translateY(-3px) scale(1.05);
  box-shadow:
      0 8px 25px rgba(255, 95, 1, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.filter-chip.critical {
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.2);
}

.filter-chip.critical::before {
  background: linear-gradient(135deg, rgba(220, 38, 38, 0.1), rgba(185, 28, 28, 0.1));
}

.filter-chip.critical:hover,
.filter-chip.critical.active {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  border-color: #dc2626;
  box-shadow:
      0 8px 25px rgba(220, 38, 38, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.filter-count {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.8) 100%);
  color: #111827;
  border-radius: 16px;
  padding: 3px 8px;
  font-size: 0.75rem;
  font-weight: 800;
  min-width: 20px;
  text-align: center;
  box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.1),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}

.filter-chip.active .filter-count,
.filter-chip.critical.active .filter-count {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%);
  color: #111827;
  text-shadow: none;
}

.basic-filters,
.advanced-filters {
  display: grid;
  gap: 20px;
}

.basic-filters {
  grid-template-columns: 2fr 1fr 1fr;
}

.advanced-filters {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(229, 231, 235, 0.6);
  position: relative;
}

.advanced-filters::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 20%;
  right: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, #FF5F01, transparent);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  font-weight: 700;
  color: #374151;
  margin-bottom: 4px;
}

.filter-label i {
  color: #FF5F01;
  font-size: 1rem;
  text-shadow: 0 0 10px rgba(255, 95, 1, 0.3);
}

.filter-input,
.filter-select,
.filter-date {
  padding: 12px 16px;
  border: 2px solid transparent;
  border-radius: 12px;
  font-size: 0.875rem;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  position: relative;
}

.filter-input:focus,
.filter-select:focus,
.filter-date:focus {
  outline: none;
  border-color: #FF5F01;
  box-shadow:
      0 0 0 4px rgba(255, 95, 1, 0.15),
      0 8px 25px rgba(255, 95, 1, 0.2);
  transform: translateY(-2px);
}

.filter-input {
  padding-right: 44px;
}

.btn-clear-input {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  border: none;
  cursor: pointer;
  color: #64748b;
  padding: 6px;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-clear-input:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.date-range {
  display: flex;
  align-items: center;
  gap: 16px;
}

.date-separator {
  color: #FF5F01;
  font-size: 1rem;
  font-weight: 800;
  text-shadow: 0 0 10px rgba(255, 95, 1, 0.3);
}

.sort-controls {
  display: flex;
  gap: 8px;
}

.btn-sort-order {
  padding: 12px;
  border: 2px solid transparent;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 12px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.btn-sort-order:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-color: rgba(255, 95, 1, 0.3);
  color: #FF5F01;
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 8px 25px rgba(255, 95, 1, 0.2);
}

.active-filters {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(229, 231, 235, 0.6);
  position: relative;
}

.active-filters::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 30%;
  right: 30%;
  height: 1px;
  background: linear-gradient(90deg, transparent, #3b82f6, transparent);
}

.active-filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #374151;
}

.active-filter-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 2px solid rgba(30, 64, 175, 0.2);
  box-shadow:
      0 4px 12px rgba(30, 64, 175, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
}

.filter-tag::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.5s;
}

.filter-tag:hover::before {
  left: 100%;
}

.remove-filter {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
  border: none;
  cursor: pointer;
  color: #1e40af;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  box-shadow: 0 2px 4px rgba(30, 64, 175, 0.2);
}

.remove-filter:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
  transform: scale(1.2) rotate(90deg);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
}

.results-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 18px;
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #065f46;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 600;
  border: 2px solid rgba(6, 95, 70, 0.2);
  box-shadow:
      0 4px 12px rgba(6, 95, 70, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
}

.results-info::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

.results-info i {
  color: #10b981;
  font-size: 1.1rem;
  text-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
}

.saved-filters {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(229, 231, 235, 0.6);
  position: relative;
}

.saved-filters::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 25%;
  right: 25%;
  height: 1px;
  background: linear-gradient(90deg, transparent, #8b5cf6, transparent);
}

.saved-filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #374151;
}

.btn-save {
  padding: 8px 16px;
  border: none;
  background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
  color: #FF5F01;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow:
      0 4px 12px rgba(255, 95, 1, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.8);
  position: relative;
  overflow: hidden;
}

.btn-save::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  transition: left 0.5s;
}

.btn-save:hover:not(:disabled) {
  background: linear-gradient(135deg, #FF5F01 0%, #f59e0b 100%);
  color: white;
  transform: translateY(-2px) scale(1.02);
  box-shadow:
      0 8px 25px rgba(255, 95, 1, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.btn-save:hover::before {
  left: 100%;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.saved-filter-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
}

.saved-filter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 2px solid rgba(229, 231, 235, 0.5);
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.05),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
  position: relative;
  overflow: hidden;
}

.saved-filter-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 95, 1, 0.05), rgba(245, 158, 11, 0.05));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.saved-filter-item:hover {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-color: rgba(255, 95, 1, 0.4);
  transform: translateY(-2px) scale(1.02);
  box-shadow:
      0 8px 25px rgba(255, 95, 1, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.saved-filter-item:hover::before {
  opacity: 1;
}

.btn-delete-saved {
  padding: 6px 8px;
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  border: none;
  cursor: pointer;
  color: #dc2626;
  border-radius: 8px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(220, 38, 38, 0.1);
}

.btn-delete-saved:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  color: white;
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
}

/* ================================================================
   ENHANCED SCROLLBARS
   ================================================================ */

.saved-filter-list::-webkit-scrollbar {
  width: 8px;
}

.saved-filter-list::-webkit-scrollbar-track {
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  border-radius: 10px;
}

.saved-filter-list::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #FF5F01, #f59e0b);
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(255, 95, 1, 0.3);
}

.saved-filter-list::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  box-shadow: 0 4px 8px rgba(245, 158, 11, 0.4);
}

/* ================================================================
   ADVANCED ANIMATIONS
   ================================================================ */

@keyframes filterApplied {
  0% {
    background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
    transform: scale(1.02);
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.3);
  }
  100% {
    background: transparent;
    transform: scale(1);
    box-shadow: none;
  }
}

.filter-group.changed {
  animation: filterApplied 0.8s ease-out;
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.filter-tag {
  animation: slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 95, 1, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(255, 95, 1, 0);
  }
}

.filter-chip.active {
  animation: pulse 2s infinite;
}

/* ================================================================
   LOADING STATES
   ================================================================ */

.notification-filters.loading {
  opacity: 0.8;
  pointer-events: none;
  position: relative;
}

.notification-filters.loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8));
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

/* ================================================================
   RESPONSIVE DESIGN
   ================================================================ */

@media (max-width: 768px) {
  .notification-filters {
    padding: 20px;
    border-radius: 16px;
  }

  .basic-filters {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .advanced-filters {
    grid-template-columns: 1fr;
  }

  .quick-filters {
    gap: 8px;
  }

  .filter-chip {
    font-size: 0.8rem;
    padding: 8px 14px;
  }

  .active-filter-tags {
    gap: 8px;
  }

  .filter-tag {
    font-size: 0.8rem;
    padding: 6px 12px;
  }

  .date-range {
    flex-direction: column;
    gap: 12px;
  }

  .date-separator {
    display: none;
  }

  .sort-controls {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .notification-filters {
    padding: 16px;
    border-radius: 14px;
  }

  .filters-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .quick-filters {
    flex-direction: column;
  }

  .filter-chip {
    justify-content: space-between;
    width: 100%;
  }

  .active-filters-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .saved-filters-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .filter-tag {
    width: 100%;
    justify-content: space-between;
  }
}

/* ================================================================
   ACCESSIBILITY
   ================================================================ */

.filter-input:focus,
.filter-select:focus,
.filter-date:focus {
  box-shadow:
      0 0 0 4px rgba(255, 95, 1, 0.15),
      0 8px 25px rgba(255, 95, 1, 0.2);
}

.filter-chip:focus,
.btn-clear:focus,
.btn-advanced:focus,
.btn-save:focus,
.saved-filter-item:focus {
  outline: 3px solid rgba(255, 95, 1, 0.5);
  outline-offset: 3px;
}

/* ================================================================
   INTERACTIVE STATES
   ================================================================ */

.filter-chip:active {
  transform: translateY(-1px) scale(0.98);
}

.btn-clear:active,
.btn-advanced:active,
.btn-save:active {
  transform: translateY(-1px) scale(0.98);
}

/* ================================================================
   GLASSMORPHISM EFFECTS
   ================================================================ */

.notification-filters {
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
}

.filter-chip,
.filter-input,
.filter-select,
.filter-date {
  backdrop-filter: blur(10px) saturate(150%);
  -webkit-backdrop-filter: blur(10px) saturate(150%);
}

/* ================================================================
   DARK MODE SUPPORT READY
   ================================================================ */

@media (prefers-reduced-motion: reduce) {
  .notification-filters::before,
  .filter-chip,
  .btn-clear,
  .btn-advanced,
  .btn-save,
  .saved-filter-item,
  .filter-tag {
    transition: none;
    animation: none;
  }

  .filter-group.changed {
    animation: none;
  }

  .shimmer,
  .pulse {
    animation: none;
  }
}

/* ================================================================
   HIGH CONTRAST MODE
   ================================================================ */

@media (prefers-contrast: high) {
  .notification-filters {
    border: 2px solid #000;
    box-shadow: none;
  }

  .filter-chip,
  .btn-clear,
  .btn-advanced,
  .btn-save {
    border: 2px solid #000;
    box-shadow: none;
  }
}

/* ================================================================
   PRINT STYLES
   ================================================================ */

@media print {
  .notification-filters {
    background: white;
    box-shadow: none;
    border: 1px solid #000;
  }

  .filter-chip,
  .btn-clear,
  .btn-advanced,
  .btn-save {
    background: white;
    color: #000;
    border: 1px solid #000;
  }
}
</style>