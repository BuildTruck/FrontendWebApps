<script>
import { userService} from "../../services/user-api.service.js";
import { adminService } from '../services/admin-api.service.js'
import AppButton from '../../../core/components/AppButton.vue'
import AppInput from '../../../core/components/AppInput.vue'
import AppNotification from '../../../core/components/AppNotification.vue'

export default {
  name: 'AdminUser',
  components: {
    AppButton,
    AppInput,
    AppNotification
  },
  data() {
    return {
      loading: true,
      users: [],
      showModal: false,
      searchTerm: '',
      modalMode: 'create',
      currentUser: this.getEmptyUser(),
      errors: {},
      notification: {
        visible: false,
        message: '',
        type: 'success'
      },
      deleteConfirm: {
        visible: false,
        user: null
      },
      isSubmitting: false
    }
  },
  computed: {
    filteredUsers() {
      if (!this.searchTerm) return this.users

      const term = this.searchTerm.toLowerCase()
      return this.users.filter(user => {
        // Manejar ambos campos para compatibilidad
        const lastName = user.lastName || user.lastname || ''
        return user.name.toLowerCase().includes(term) ||
            lastName.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term) ||
            user.role.toLowerCase().includes(term) ||
            (user.phone && user.phone.includes(term))
      })
    },
    modalTitle() {
      return this.modalMode === 'create'
          ? this.$t('admin.users.createUser')
          : this.$t('admin.users.editUser')
    },
    roleOptions() {
      return [
        { value: 'admin', label: this.$t('admin.users.roles.admin') },
        { value: 'manager', label: this.$t('admin.users.roles.manager') },
        { value: 'supervisor', label: this.$t('admin.users.roles.supervisor') }
      ]
    },
    emailPreview() {
      if (this.modalMode === 'edit') {
        return this.currentUser.email || 'N/A'
      }

      // Para modo crear, mostrar preview solo si hay nombre
      if (!this.currentUser.name || this.currentUser.name.trim() === '') {
        return 'nombre@buildtruck.com'
      }

      return userService.generateEmailPreview(this.currentUser.name)
    }
  },
  async mounted() {
    document.addEventListener('keydown', this.handleKeyDown)
    await this.loadUsers()
  },
  methods: {
    getEmptyUser() {
      return {
        id: null,
        email: '',
        password: '',
        personalEmail: '',
        name: '',
        lastName: '',
        phone: '',
        role: 'supervisor',
        permissions: []
      }
    },

    async loadUsers() {
      try {
        this.loading = true
        const response = await userService.getAll()
        this.users = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      } catch (error) {
        console.error('Error cargando usuarios:', error)
        this.showNotification(this.$t('admin.users.errors.loadUsers'), 'error')
      } finally {
        this.loading = false
      }
    },

    openCreateModal() {
      if (this.isSubmitting) return

      this.currentUser = this.getEmptyUser()
      this.modalMode = 'create'
      this.errors = {}
      this.showModal = true

      this.$nextTick(() => {
        const firstInput = this.$el.querySelector('.modal input')
        if (firstInput) {
          firstInput.focus()
        }
      })
    },

    openEditModal(user) {
      if (this.isSubmitting) return

      this.currentUser = {
        ...user,

        lastName: user.lastName || user.lastname || ''
      }

      if (this.currentUser.lastname) {
        delete this.currentUser.lastname
      }

      this.modalMode = 'edit'
      this.errors = {}
      this.showModal = true
    },

    closeModal() {
      if (this.isSubmitting) return

      this.showModal = false
      this.currentUser = this.getEmptyUser()
      this.errors = {}
    },

    handleModalOverlayClick(event) {
      if (event.target === event.currentTarget && !this.isSubmitting) {
        this.closeModal()
      }
    },

    validateUser() {
      this.errors = {}


      this.currentUser.name = this.currentUser.name?.trim() || ''
      this.currentUser.lastName = this.currentUser.lastName?.trim() || ''
      this.currentUser.personalEmail = this.currentUser.personalEmail?.trim() || ''
      this.currentUser.phone = this.currentUser.phone?.trim() || ''

      if (!this.currentUser.name) {
        this.errors.name = this.$t('admin.users.validation.nameRequired')
      }

      if (!this.currentUser.lastName) {
        this.errors.lastName = this.$t('admin.users.validation.lastnameRequired')
      }

      if (this.modalMode === 'create' && !this.currentUser.password) {
        this.errors.password = this.$t('admin.users.validation.passwordRequired')
      }

      if (!this.currentUser.role) {
        this.errors.role = this.$t('admin.users.validation.roleRequired')
      }

      // Validar email personal si se proporciona
      if (this.currentUser.personalEmail && !this.isValidEmail(this.currentUser.personalEmail)) {
        this.errors.personalEmail = 'Email personal no válido'
      }

      return Object.keys(this.errors).length === 0
    },

    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return emailRegex.test(email)
    },

    async saveUser() {
      if (this.isSubmitting) return

      if (!this.validateUser()) return

      try {
        this.isSubmitting = true


        const userData = {
          email: this.currentUser.email || '',
          personalEmail: this.currentUser.personalEmail || '',
          name: this.currentUser.name.trim(),
          lastName: this.currentUser.lastName.trim(), // SOLO lastName en camelCase
          phone: this.currentUser.phone || '',
          role: this.currentUser.role,
          permissions: this.currentUser.permissions || []
        }

        // Solo agregar password en modo crear
        if (this.modalMode === 'create') {
          userData.password = this.currentUser.password
        } else {
          userData.id = this.currentUser.id
        }

        // Doble verificación - eliminar cualquier campo lastname en minúscula
        delete userData.lastname;
        delete userData.last_name;

        console.log('Datos a enviar:', userData) // Para debug

        if (this.modalMode === 'create') {
          const response = await userService.createUser(userData)
          this.showNotification(this.$t('admin.users.messages.userCreated'), 'success')
        } else {
          const response = await userService.updateUser(userData.id, userData)
          this.showNotification(this.$t('admin.users.messages.userUpdated'), 'success')
        }

        // Resetear isSubmitting ANTES de cerrar modal
        this.isSubmitting = false
        this.closeModal()
        await this.loadUsers()

      } catch (error) {
        console.error('Error guardando usuario:', error)


        if (error.response?.data?.message) {
          this.showNotification(error.response.data.message, 'error')
        } else if (error.response?.status === 409) {
          this.showNotification('El email ya existe en el sistema', 'error')
        } else {
          this.showNotification(this.$t('admin.users.errors.saveUser'), 'error')
        }

        this.isSubmitting = false
      }
    },

    async confirmDelete(user) {
      if (this.isSubmitting) return

      try {
        const canDelete = await adminService.canDeleteUser(user.id)
        if (!canDelete) {
          this.showNotification('No se puede eliminar este usuario', 'error')
          return
        }

        this.deleteConfirm.user = user
        this.deleteConfirm.visible = true
      } catch (error) {
        console.error('Error verificando si se puede eliminar usuario:', error)
        this.showNotification('Error al verificar permisos de eliminación', 'error')
      }
    },

    async deleteUser() {
      if (this.isSubmitting) return

      try {
        this.isSubmitting = true
        await userService.deleteUser(this.deleteConfirm.user.id)
        this.showNotification(this.$t('admin.users.messages.userDeleted'), 'success')
        this.deleteConfirm.visible = false
        this.deleteConfirm.user = null
        await this.loadUsers()
      } catch (error) {
        console.error('Error eliminando usuario:', error)
        this.showNotification(this.$t('admin.users.errors.deleteUser'), 'error')
      } finally {
        this.isSubmitting = false
      }
    },

    closeDeleteConfirm() {
      if (this.isSubmitting) return
      this.deleteConfirm.visible = false
      this.deleteConfirm.user = null
    },

    showNotification(message, type = 'success') {
      this.notification.message = message
      this.notification.type = type
      this.notification.visible = true
    },

    formatDate(dateString) {
      if (!dateString) return 'N/A'

      const date = new Date(dateString)
      return date.toLocaleDateString('es-PE', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    },

    // Método adicional para mostrar fecha y hora completa (para lastLogin)
    formatDateTime(dateString) {
      if (!dateString) return 'Nunca'

      const date = new Date(dateString)
      return date.toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    },

    getRoleColor(role) {
      switch(role) {
        case 'admin': return '#f44336'
        case 'manager': return '#2196F3'
        case 'supervisor': return '#4CAF50'
        default: return '#666'
      }
    },

    handleKeyDown(event) {
      if (event.key === 'Escape' && (this.showModal || this.deleteConfirm.visible) && !this.isSubmitting) {
        if (this.deleteConfirm.visible) {
          this.closeDeleteConfirm()
        } else {
          this.closeModal()
        }
      }
    }
  },

  beforeUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown)
  }
}
</script>

<template>
  <div class="admin-users">
    <!-- Header -->
    <div class="users-header">
      <h2>{{ $t('admin.users.title') }}</h2>
      <app-button
          :label="$t('admin.users.createUser')"
          icon="pi pi-plus"
          variant="primary"
          :disabled="isSubmitting"
          @click="openCreateModal"
      />
    </div>

    <div class="search-container">
      <div class="search-input-wrapper">
        <i class="pi pi-search search-icon"></i>
        <input
            v-model="searchTerm"
            type="text"
            :placeholder="$t('admin.actions.search')"
            class="search-input"
            :disabled="isSubmitting"
        />
        <button
            v-if="searchTerm"
            @click="searchTerm = ''"
            class="clear-search"
            :disabled="isSubmitting"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>
      <div v-if="searchTerm" class="search-results-info">
        {{ filteredUsers.length }} de {{ users.length }} usuarios
      </div>
    </div>


    <div v-if="loading" class="loading-container">
      <i class="pi pi-spin pi-spinner"></i>
      <p>{{ $t('admin.actions.loading') }}</p>
    </div>

    <!-- Users Table -->
    <div v-else class="users-table-container">
      <div class="users-table">
        <div class="table-header">
          <div class="header-cell">{{ $t('admin.users.table.user') }}</div>
          <div class="header-cell">{{ $t('admin.users.table.email') }}</div>
          <div class="header-cell">{{ $t('admin.users.table.role') }}</div>
          <div class="header-cell">{{ $t('admin.users.table.created') }}</div>
          <div class="header-cell">Último Acceso</div>
          <div class="header-cell">{{ $t('admin.users.table.actions') }}</div>
        </div>

        <div v-for="user in filteredUsers" :key="user.id" class="table-row">
          <div class="cell user-cell">
            <div class="user-info">
              <h4>{{ user.name }} {{ user.lastName || user.lastname }}</h4>
              <p>{{ user.phone || 'N/A' }}</p>
            </div>
          </div>
          <div class="cell">{{ user.email }}</div>
          <div class="cell">
            <span
                class="role-badge"
                :style="{ backgroundColor: getRoleColor(user.role) }"
            >
              {{ $t(`admin.users.roles.${user.role}`) }}
            </span>
          </div>
          <div class="cell">{{ formatDate(user.createdAt) }}</div>
          <div class="cell">
            <span :class="user.lastLogin ? 'last-login-active' : 'last-login-never'">
              {{ formatDateTime(user.lastLogin) }}
            </span>
          </div>
          <div class="cell actions-cell">
            <app-button
                icon="pi pi-pencil"
                variant="text"
                size="small"
                :disabled="isSubmitting"
                @click="openEditModal(user)"
            />
            <app-button
                icon="pi pi-trash"
                variant="text"
                size="small"
                :disabled="isSubmitting"
                @click="confirmDelete(user)"
            />
          </div>
        </div>

        <div v-if="filteredUsers.length === 0 && !loading" class="empty-state">
          <i class="pi pi-users"></i>
          <p v-if="searchTerm">No se encontraron usuarios con "{{ searchTerm }}"</p>
          <p v-else>{{ $t('admin.users.noUsers') }}</p>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click="handleModalOverlayClick">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>TEST MODAL</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>
        <div class="modal-body">
          <p>Modal visible - Modo: {{ modalMode }}</p>
          <p>Env: {{ $env || 'no env' }}</p>
        </div>
      </div>
    </div>

    <div v-if="deleteConfirm.visible" class="modal-overlay" @click="closeDeleteConfirm">
      <div class="modal confirm-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ $t('admin.users.confirmDelete') }}</h3>
        </div>

        <div class="modal-body">
          <div class="confirm-content">
            <i class="pi pi-exclamation-triangle warning-icon"></i>
            <p>{{ $t('admin.users.confirmDeleteMessage') }}</p>
            <p><strong>{{ deleteConfirm.user?.name }} {{ deleteConfirm.user?.lastName || deleteConfirm.user?.lastname }}</strong></p>
          </div>
        </div>

        <div class="modal-footer">
          <app-button
              :label="$t('admin.actions.cancel')"
              variant="secondary"
              :disabled="isSubmitting"
              @click="closeDeleteConfirm"
          />
          <app-button
              :label="isSubmitting ? 'Eliminando...' : $t('admin.actions.delete')"
              variant="primary"
              :disabled="isSubmitting"
              @click="deleteUser"
          />
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
.admin-users {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.users-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.users-header h2 {
  color: #333;
  margin: 0;
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

.users-table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.users-table {
  width: 100%;
}

.table-header {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr 1fr 1fr;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
}

.header-cell {
  padding: 1rem;
  font-weight: 600;
  color: #333;
  border-right: 1px solid #eee;
}

.header-cell:last-child {
  border-right: none;
}

.table-row {
  display: grid;
  grid-template-columns: 2fr 2fr 1fr 1fr 1fr 1fr;
  border-bottom: 1px solid #eee;
}

.table-row:hover {
  background: #f8f9fa;
}

.cell {
  padding: 1rem;
  display: flex;
  align-items: center;
  border-right: 1px solid #eee;
}

.cell:last-child {
  border-right: none;
}

.user-cell .user-info h4 {
  margin: 0 0 0.25rem 0;
  color: #333;
  font-size: 0.9rem;
}

.user-cell .user-info p {
  margin: 0;
  color: #666;
  font-size: 0.8rem;
}

.role-badge {
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.actions-cell {
  gap: 0.5rem;
}

.last-login-active {
  color: #4CAF50;
  font-size: 0.85rem;
}

.last-login-never {
  color: #999;
  font-style: italic;
  font-size: 0.85rem;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #ccc;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal {
  background: white;
  border-radius: 8px;
  width: 600px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
  animation: modalFadeIn 0.2s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.confirm-modal {
  width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #666;
  padding: 0.5rem;
  transition: color 0.2s ease;
}

.modal-close:hover:not(:disabled) {
  color: #FF5F01;
}

.modal-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-body {
  padding: 1.5rem;
}

.confirm-content {
  text-align: center;
}

.warning-icon {
  font-size: 3rem;
  color: #ff9800;
  margin-bottom: 1rem;
}

.confirm-content p {
  margin: 0.5rem 0;
  color: #666;
}

.confirm-content strong {
  color: #333;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-grid .app-input-container:nth-child(2) {
  grid-column: 1 / -1;
}

.form-grid .app-input-container:last-child {
  grid-column: 1 / -1;
}

/* Email Preview Styles */
.email-preview-container {
  grid-column: 1 / -1;
  margin-bottom: 1rem;
}

.email-preview-label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.email-preview {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  color: #495057;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
}

.email-preview i {
  color: #6c757d;
  font-size: 1rem;
}

.email-preview-note {
  display: block;
  margin-top: 0.25rem;
  color: #6c757d;
  font-size: 0.75rem;
  font-style: italic;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #eee;
}

/* Search Styles */
.search-container {
  margin-bottom: 1.5rem;
}

.search-input-wrapper {
  position: relative;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
  z-index: 1;
}

.search-input {
  background-color: #ffffff;
  color: #495057;
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: #FF5F01;
  box-shadow: 0 0 0 3px rgba(255, 95, 1, 0.1);
}

.search-input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
  opacity: 0.7;
}

.clear-search {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.clear-search:hover:not(:disabled) {
  background: #f8f9fa;
  color: #FF5F01;
}

.clear-search:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.search-results-info {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #6c757d;
  font-style: italic;
}

/* Responsive */
@media (max-width: 768px) {
  .search-input-wrapper {
    max-width: 100%;
  }

  .admin-users {
    padding: 1rem;
  }

  .users-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }

  .table-header,
  .table-row {
    display: block;
  }

  .header-cell {
    display: none;
  }

  .cell {
    display: block;
    padding: 0.5rem 1rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .modal {
    margin: 1rem;
    width: calc(100% - 2rem);
  }
}
</style>