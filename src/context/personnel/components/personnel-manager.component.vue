<template>
  <div class="personnel-manager">
    <div class="page-header">
      <h2>Gestión de Personal</h2>
      <p class="page-description">Vista de solo lectura del personal registrado</p>
    </div>

    <app-table
        :columns="columns"
        :data="personnelList"
        :loading="loading"
        :paginator="true"
        :rows="15"
        :striped="true"
        :show-gridlines="true"
        :scrollable="true"
        scroll-height="500px"
        :show-export-button="true"
        :show-filter-button="true"
        :show-rows-per-page-dropdown="true"
        :rows-per-page-options="[10, 15, 25, 50]"
        :global-filter-fields="['nombre', 'dni', 'rol', 'estado']"
        @export="handleExport"
        @filter="handleFilter"
    >
      <template #empty>
        <div class="empty-state">
          <i class="pi pi-users empty-icon"></i>
          <p>No hay personal registrado</p>
        </div>
      </template>
    </app-table>

    <!-- Notificación -->
    <app-notification
        v-model="notification.show"
        :message="notification.message"
        :type="notification.type"
        :auto-close="true"
        :duration="3000"
    />
  </div>
</template>

<script>
import AppTable from "../../../core/components/AppTable.vue";
import AppNotification from "../../../core/components/AppNotification.vue";
import { PersonnelApiService} from "../services/personnel-api.service.js";

export default {
  name: 'PersonnelManager',
  components: {
    AppTable,
    AppNotification
  },
  props: {
    projectId: {
      type: [String, Number],
      default: null
    }
  },
  data() {
    return {
      personnelList: [],
      loading: false,
      personnelService: new PersonnelApiService(),
      notification: {
        show: false,
        message: '',
        type: 'success'
      },
      columns: [
        {
          field: 'avatar',
          header: '',
          sortable: false,
          style: 'width: 60px; text-align: center;'
        },
        {
          field: 'nombre',
          header: 'Nombre',
          sortable: true,
          filterable: true,
          style: 'min-width: 200px;'
        },
        {
          field: 'dni',
          header: 'DNI',
          sortable: true,
          filterable: true,
          style: 'min-width: 120px;'
        },
        {
          field: 'rol',
          header: 'Rol',
          sortable: true,
          filterable: true,
          style: 'min-width: 130px;'
        },
        {
          field: 'estado',
          header: 'Estado',
          sortable: true,
          filterable: true,
          style: 'min-width: 120px;'
        },
        {
          field: 'fechaIngreso',
          header: 'Fecha Ingreso',
          sortable: true,
          dataType: 'date',
          style: 'min-width: 130px;'
        },
        {
          field: 'telefono',
          header: 'Teléfono',
          sortable: true,
          style: 'min-width: 130px;'
        },
        {
          field: 'correo',
          header: 'Correo',
          sortable: true,
          style: 'min-width: 200px;'
        }
      ]
    };
  },
  async mounted() {
    await this.loadPersonnel();
  },
  methods: {
    async loadPersonnel() {
      try {
        this.loading = true;

        if (this.projectId) {
          this.personnelList = await this.personnelService.getByProject(this.projectId);
        } else {
          this.personnelList = await this.personnelService.getAll();
        }

        // Procesar avatares para mostrar
        this.personnelList = this.personnelList.map(person => ({
          ...person,
          avatarDisplay: this.getAvatarDisplay(person)
        }));

      } catch (error) {
        console.error('Error al cargar personal:', error);
        this.showNotification('Error al cargar la lista de personal', 'error');
      } finally {
        this.loading = false;
      }
    },

    getAvatarDisplay(person) {
      if (person.avatar) {
        // Si tiene avatar, mostrar imagen circular pequeña
        return `<img src="${person.avatar}" alt="${person.nombre}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />`;
      } else {
        // Si no tiene avatar, mostrar iniciales
        const initials = person.getInitials();
        return `<div style="width: 32px; height: 32px; border-radius: 50%; background-color: #FF5F01; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem;">${initials}</div>`;
      }
    },

    async handleExport(exportData) {
      try {
        this.loading = true;

        // Usar los datos filtrados de la tabla
        const dataToExport = exportData.filteredData.map(person => ({
          'Nombre': person.nombre,
          'DNI': person.dni,
          'Rol': person.rol,
          'Estado': person.estado,
          'Fecha de Ingreso': person.fechaIngreso ? this.formatDate(person.fechaIngreso) : '',
          'Teléfono': person.telefono || '',
          'Correo': person.correo || ''
        }));

        // Crear archivo Excel
        await this.exportToExcel(dataToExport, 'Personal_Lista');

        this.showNotification('Exportación completada exitosamente', 'success');

      } catch (error) {
        console.error('Error al exportar:', error);
        this.showNotification('Error al exportar los datos', 'error');
      } finally {
        this.loading = false;
      }
    },

    async exportToExcel(data, filename) {
      // Función simple para exportar a Excel usando las capacidades del navegador
      const headers = Object.keys(data[0]);
      let csvContent = headers.join(',') + '\n';

      data.forEach(row => {
        const values = headers.map(header => {
          const value = row[header] || '';
          // Escapar comillas y envolver en comillas si contiene comas
          return value.toString().includes(',') ? `"${value.replace(/"/g, '""')}"` : value;
        });
        csvContent += values.join(',') + '\n';
      });

      // Crear blob y descargar
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}_${this.getCurrentDateString()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    handleFilter(filterData) {
      console.log('Filtros aplicados:', filterData);
    },

    getCurrentDateString() {
      return new Date().toLocaleDateString('es-PE').replace(/\//g, '-');
    },

    formatDate(date) {
      if (!date) return '';
      return new Date(date).toLocaleDateString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    },

    showNotification(message, type = 'success') {
      this.notification = {
        show: true,
        message,
        type
      };
    }
  }
};
</script>

<style scoped>
.personnel-manager {
  padding: 1.5rem;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 2rem;
  text-align: center;
}

.page-header h2 {
  color: #0D1C3C;
  font-size: 2rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
}

.page-description {
  color: #666;
  font-size: 1.1rem;
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #666;
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.5;
  margin-bottom: 1rem;
  color: #FF5F01;
}

.empty-state p {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
}

/* Responsive */
@media (max-width: 768px) {
  .personnel-manager {
    padding: 1rem;
  }

  .page-header h2 {
    font-size: 1.5rem;
  }

  .page-description {
    font-size: 1rem;
  }
}
</style>