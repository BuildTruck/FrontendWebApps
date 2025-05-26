<script>
import { adminService } from '../services/admin-api.service'
import AppButton from '../../../core/components/AppButton.vue'
import AppNotification from '../../../core/components/AppNotification.vue'

export default {
  name: 'AdminDashboard',
  components: {
    AppButton,
    AppNotification
  },
  data() {
    return {
      loading: true,
      dashboardData: {
        stats: {
          totalUsers: 0,
          managers: 0,
          supervisors: 0,
          admins: 0,
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0
        },
        recentUsers: [],
        projects: []
      },
      notification: {
        visible: false,
        message: '',
        type: 'success'
      }
    }
  },
  computed: {
    userRoleChartData() {
      return {
        labels: ['Administradores', 'Managers', 'Supervisores'],
        datasets: [{
          data: [
            this.dashboardData.stats.admins,
            this.dashboardData.stats.managers,
            this.dashboardData.stats.supervisors
          ],
          backgroundColor: ['#f44336', '#2196F3', '#4CAF50']
        }]
      }
    },

    projectStatusChartData() {
      return {
        labels: ['Total', 'Activos', 'Completados'],
        datasets: [{
          label: 'Proyectos',
          data: [
            this.dashboardData.stats.totalProjects,
            this.dashboardData.stats.activeProjects,
            this.dashboardData.stats.completedProjects
          ],
          backgroundColor: ['#FF9800', '#4CAF50', '#2196F3']
        }]
      }
    },

    chartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    }
  },
  async mounted() {
    await this.loadDashboardData()
  },
  methods: {
    async loadDashboardData() {
      try {
        this.loading = true
        const response = await adminService.getDashboardStats()
        this.dashboardData = response.data
      } catch (error) {
        console.error('Error cargando dashboard:', error)
        this.showNotification('Error al cargar datos del dashboard', 'error')
      } finally {
        this.loading = false
      }
    },

    goToUsers() {
      this.$router.push('/admin/usuarios')
    },

    showNotification(message, type = 'success') {
      this.notification.message = message
      this.notification.type = type
      this.notification.visible = true
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A'
      return new Date(dateString).toLocaleDateString('es-ES')
    },

    getRoleIcon(role) {
      switch(role) {
        case 'admin': return 'pi pi-shield'
        case 'manager': return 'pi pi-briefcase'
        case 'supervisor': return 'pi pi-user'
        default: return 'pi pi-user'
      }
    }
  }
}
</script>

<template>
  <div class="admin-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <h2>{{ $t('admin.dashboard.welcome') }}</h2>
      <p>{{ $t('admin.dashboard.subtitle') }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <i class="pi pi-spin pi-spinner"></i>
      <p>{{ $t('admin.actions.loading') }}</p>
    </div>

    <!-- Dashboard Content -->
    <div v-else class="dashboard-content">
      <!-- Statistics Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">
            <i class="pi pi-users"></i>
          </div>
          <div class="stat-info">
            <h3>{{ dashboardData.stats.totalUsers }}</h3>
            <p>{{ $t('admin.dashboard.totalUsers') }}</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon managers">
            <i class="pi pi-briefcase"></i>
          </div>
          <div class="stat-info">
            <h3>{{ dashboardData.stats.managers }}</h3>
            <p>{{ $t('admin.dashboard.managers') }}</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon supervisors">
            <i class="pi pi-user"></i>
          </div>
          <div class="stat-info">
            <h3>{{ dashboardData.stats.supervisors }}</h3>
            <p>{{ $t('admin.dashboard.supervisors') }}</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon projects">
            <i class="pi pi-folder"></i>
          </div>
          <div class="stat-info">
            <h3>{{ dashboardData.stats.totalProjects }}</h3>
            <p>{{ $t('admin.dashboard.projects') }}</p>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-section">
        <div class="chart-card">
          <h3>Usuarios por Rol</h3>
          <pv-chart type="doughnut" :data="userRoleChartData" :options="chartOptions" />
        </div>

        <div class="chart-card">
          <h3>Estado de Proyectos</h3>
          <pv-chart type="bar" :data="projectStatusChartData" :options="chartOptions" />
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <h3>{{ $t('admin.dashboard.quickActions') }}</h3>
        <div class="actions-grid">
          <app-button
              :label="$t('admin.dashboard.manageUsers')"
              icon="pi pi-users"
              variant="primary"
              @click="goToUsers"
          />
        </div>
      </div>

      <!-- Recent Users -->
      <div class="recent-users">
        <h3>{{ $t('admin.dashboard.recentUsers') }}</h3>
        <div class="users-list">
          <div v-for="user in dashboardData.recentUsers" :key="user.id" class="user-item">
            <div class="user-avatar">
              <i :class="getRoleIcon(user.role)"></i>
            </div>
            <div class="user-info">
              <h4>{{ user.name }} {{ user.lastname }}</h4>
              <p>{{ user.email }}</p>
              <span class="user-role">{{ $t(`admin.users.roles.${user.role}`) }}</span>
            </div>
            <div class="user-date">
              <small>{{ formatDate(user.createdAt) }}</small>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Notification -->
    <app-notification
        v-model="notification.visible"
        :message="notification.message"
        :type="notification.type"
        :auto-close="true"
    />
  </div>
</template>


<style scoped>
.admin-dashboard {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 2rem;
}

.dashboard-header h2 {
  font-size: 2rem;
  color: #333;
  margin-bottom: 0.5rem;
}

.dashboard-header p {
  color: #666;
  font-size: 1.1rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #666;
}

.loading-container i {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #FF5F01;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FF5F01;
  color: white;
  font-size: 1.5rem;
}

.stat-icon.managers {
  background-color: #2196F3;
}

.stat-icon.supervisors {
  background-color: #4CAF50;
}

.stat-icon.projects {
  background-color: #FF9800;
}

.stat-info h3 {
  font-size: 2rem;
  color: #333;
  margin: 0 0 0.25rem 0;
}

.stat-info p {
  color: #666;
  margin: 0;
  font-size: 0.9rem;
}

.charts-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.chart-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  height: 350px;
}

.chart-card h3 {
  color: #333;
  margin-bottom: 1rem;
  text-align: center;
}

.quick-actions {
  margin-bottom: 2rem;
}

.quick-actions h3 {
  color: #333;
  margin-bottom: 1rem;
}

.actions-grid {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.recent-users h3 {
  color: #333;
  margin-bottom: 1rem;
}

.users-list {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
  gap: 1rem;
}

.user-item:last-child {
  border-bottom: none;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.user-info {
  flex: 1;
}

.user-info h4 {
  margin: 0 0 0.25rem 0;
  color: #333;
  font-size: 1rem;
}

.user-info p {
  margin: 0 0 0.25rem 0;
  color: #666;
  font-size: 0.875rem;
}

.user-role {
  background: #f0f0f0;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  color: #555;
}

.user-date {
  color: #999;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .admin-dashboard {
    padding: 1rem;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .charts-section {
    grid-template-columns: 1fr;
  }

  .chart-card {
    height: 300px;
  }

  .user-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>