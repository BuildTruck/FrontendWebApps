<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Prueba AppTable</h1>

    <AppTable
        :columns="columns"
        :data="tableData"
        :loading="loading"
        :selectable="true"
        :selection="selectedRows"
        :showFilterButton="true"
        :showExportButton="true"
        :showAddButton="true"
        :paginator="true"
        :rows="rowsPerPage"
        :striped="true"
        :showGridlines="true"
        :scrollable="true"
        scrollHeight="500px"
        dataKey="id"
        :showRowsPerPageDropdown="true"
        :rowsPerPageOptions="[5, 10, 15, 25, 50]"
        @update:selection="handleSelection"
        @export="handleExport"
        @add="handleAdd"
        @delete="handleDelete"
        @filter="handleFilter"
        @row-click="handleRowClick"
        @update:rows="handleRowsChange"
    />

    <!-- Debug Info -->
    <div class="mt-6 p-4 bg-gray-100 rounded-lg">
      <h3 class="font-bold mb-3 text-lg">Debug Info:</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p><strong>Filas seleccionadas:</strong> {{ selectedRows.length }}</p>
          <p><strong>Total de datos:</strong> {{ tableData.length }}</p>
          <p><strong>Estado de carga:</strong> {{ loading ? 'Cargando...' : 'Listo' }}</p>
        </div>
        <div v-if="selectedRows.length > 0">
          <strong>Elementos seleccionados:</strong>
          <ul class="list-disc list-inside mt-2 max-h-32 overflow-y-auto">
            <li v-for="row in selectedRows" :key="row.id" class="text-sm">
              {{ row.name }} - {{ row.status }}
            </li>
          </ul>
        </div>
      </div>

      <!-- Controles de prueba -->
      <div class="mt-4 flex gap-2 flex-wrap">
        <button
            @click="toggleLoading"
            class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          {{ loading ? 'Parar carga' : 'Simular carga' }}
        </button>
        <button
            @click="addRandomData"
            class="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
        >
          Añadir datos aleatorios
        </button>
        <button
            @click="clearData"
            class="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
        >
          Limpiar datos
        </button>
        <button
            @click="resetData"
            class="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
        >
          Resetear datos
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import AppTable from "../../../core/components/AppTable.vue";

export default {
  name: 'TestAppTable',
  components: {
    AppTable
  },
  data() {
    return {
      loading: false,
      selectedRows: [],
      rowsPerPage: 10,
      originalData: [
        { id: 1, name: 'Pedro García', status: 'activo', date: '2023-01-15', balance: 1500.50, country: 'Perú', verified: true },
        { id: 2, name: 'Juan López', status: 'qualified', date: '2023-02-20', balance: 2500.75, country: 'México', verified: false },
        { id: 3, name: 'María Rodriguez', status: 'pendiente', date: '2023-03-10', balance: 1200.00, country: 'Colombia', verified: true },
        { id: 4, name: 'Ana Torres', status: 'operativo', date: '2023-04-05', balance: 3500.25, country: 'Chile', verified: true },
        { id: 5, name: 'Carlos Mendoza', status: 'inactivo', date: '2023-05-12', balance: 800.50, country: 'Argentina', verified: false },
        { id: 6, name: 'Luis Vargas', status: 'new', date: '2023-06-18', balance: 4200.00, country: 'Brasil', verified: true },
        { id: 7, name: 'Rosa Flores', status: 'negotiation', date: '2023-07-22', balance: 1800.75, country: 'Ecuador', verified: false },
        { id: 8, name: 'Miguel Santos', status: 'cancelado', date: '2023-08-30', balance: 2900.25, country: 'Uruguay', verified: true },
        { id: 9, name: 'Carmen Díaz', status: 'unqualified', date: '2023-09-14', balance: 1100.50, country: 'Paraguay', verified: false },
        { id: 10, name: 'Roberto Cruz', status: 'renewal', date: '2023-10-08', balance: 3200.00, country: 'Bolivia', verified: true },
        { id: 11, name: 'Elena Morales', status: 'mantenimiento', date: '2023-11-25', balance: 1600.75, country: 'Venezuela', verified: true },
        { id: 12, name: 'Fernando Silva', status: 'activo', date: '2023-12-03', balance: 2700.25, country: 'Perú', verified: false },
        { id: 13, name: 'Isabel Herrera', status: 'pendiente', date: '2024-01-17', balance: 900.50, country: 'Colombia', verified: true },
        { id: 14, name: 'Diego Ramírez', status: 'qualified', date: '2024-02-28', balance: 4100.00, country: 'México', verified: true },
        { id: 15, name: 'Patricia Vega', status: 'new', date: '2024-03-11', balance: 1950.75, country: 'Chile', verified: false }
      ],
      tableData: [],
      columns: [
        {
          field: 'name',
          header: 'Nombre',
          sortable: true,
          filterable: true
        },
        {
          field: 'status',
          header: 'Estado',
          sortable: true,
          filterable: true
        },
        {
          field: 'date',
          header: 'Fecha',
          dataType: 'date',
          sortable: true,
          filterable: true
        },
        {
          field: 'balance',
          header: 'Balance',
          dataType: 'numeric',
          sortable: true,
          filterable: false
        },
        {
          field: 'country',
          header: 'País',
          sortable: true,
          filterable: true
        },
        {
          field: 'verified',
          header: 'Verificado',
          dataType: 'boolean',
          sortable: true,
          filterable: false
        }
      ]
    };
  },
  created() {
    this.resetData();
  },
  methods: {
    handleSelection(selection) {
      this.selectedRows = selection;
      console.log('✅ Selección actualizada:', selection);
    },

    handleExport() {
      console.log('📥 Exportar datos ejecutado');
      console.log('Datos a exportar:', this.tableData);

      // Simulación de exportación
      const dataStr = JSON.stringify(this.tableData, null, 2);
      const dataBlob = new Blob([dataStr], {type: 'application/json'});
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'table-data.json';
      link.click();
      URL.revokeObjectURL(url);

      alert('Datos exportados como JSON');
    },

    handleAdd() {
      console.log('➕ Añadir nuevo elemento');

      const newId = Math.max(...this.tableData.map(item => item.id)) + 1;
      const statuses = ['activo', 'pendiente', 'inactivo', 'qualified', 'new'];
      const countries = ['Perú', 'México', 'Colombia', 'Chile', 'Argentina'];
      const names = ['Nuevo Usuario', 'Usuario Agregado', 'Persona Nueva', 'Cliente Nuevo'];

      const newItem = {
        id: newId,
        name: names[Math.floor(Math.random() * names.length)] + ' ' + newId,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        date: new Date().toISOString().split('T')[0],
        balance: Math.round((Math.random() * 5000 + 500) * 100) / 100,
        country: countries[Math.floor(Math.random() * countries.length)],
        verified: Math.random() > 0.5
      };

      this.tableData = [...this.tableData, newItem];
      alert(`Nuevo elemento añadido: ${newItem.name}`);
    },

    handleDelete(selectedItems) {
      console.log('🗑️ Eliminar elementos:', selectedItems);

      const confirmMessage = `¿Estás seguro de que quieres eliminar ${selectedItems.length} elemento${selectedItems.length > 1 ? 's' : ''}?`;

      if (confirm(confirmMessage)) {
        const idsToDelete = selectedItems.map(item => item.id);
        this.tableData = this.tableData.filter(item => !idsToDelete.includes(item.id));
        this.selectedRows = [];
        alert(`${selectedItems.length} elemento${selectedItems.length > 1 ? 's eliminados' : ' eliminado'}`);
      }
    },

    handleFilter(filterData) {
      console.log('🔍 Filtro aplicado:', filterData);
    },

    handleRowClick(event) {
      console.log('👆 Fila clickeada:', event.data);
    },

    handleRowsChange(newRows) {
      this.rowsPerPage = newRows;
      console.log('📊 Filas por página cambiadas a:', newRows);
    },

    // Métodos de prueba
    toggleLoading() {
      this.loading = !this.loading;

      if (this.loading) {
        // Simular carga por 3 segundos
        setTimeout(() => {
          this.loading = false;
        }, 3000);
      }
    },

    addRandomData() {
      const statuses = ['activo', 'pendiente', 'inactivo', 'qualified', 'new', 'negotiation'];
      const countries = ['Perú', 'México', 'Colombia', 'Chile', 'Argentina', 'Brasil', 'Ecuador'];
      const firstNames = ['Ana', 'Carlos', 'Elena', 'Diego', 'Sofia', 'Miguel', 'Laura', 'Andrés'];
      const lastNames = ['García', 'López', 'Martínez', 'González', 'Rodríguez', 'Fernández', 'Sánchez'];

      const randomItems = [];
      const startId = Math.max(...this.tableData.map(item => item.id), 0) + 1;

      for (let i = 0; i < 5; i++) {
        randomItems.push({
          id: startId + i,
          name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          balance: Math.round((Math.random() * 5000 + 100) * 100) / 100,
          country: countries[Math.floor(Math.random() * countries.length)],
          verified: Math.random() > 0.5
        });
      }

      this.tableData = [...this.tableData, ...randomItems];
      alert('5 elementos aleatorios añadidos');
    },

    clearData() {
      if (confirm('¿Estás seguro de que quieres limpiar todos los datos?')) {
        this.tableData = [];
        this.selectedRows = [];
      }
    },

    resetData() {
      this.tableData = [...this.originalData];
      this.selectedRows = [];
    }
  }
};
</script>

<style scoped>

</style>