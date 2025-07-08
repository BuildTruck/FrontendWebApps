<script>
import AppNotification from '../../../core/components/AppNotification.vue'
import MachineryFormGeneral from './machinery-form.vue'
import { MachineryApiService } from "../services/machinery-api.service.js";

export default {
  name: 'MachineryManager',
  components: {
    MachineryFormGeneral,
    AppNotification,
  },
  props: {
    projectId: {
      type: [String, Number],
      required: true
    }
  },
  data() {
    return {
      loading: false,
      showNotification: false,
      notificationMessage: '',
      notificationType: 'success',
      machineryService: new MachineryApiService(),
    }
  },
  computed: {
    currentProjectId() {
      return this.projectId || this.getCurrentProjectIdFromSession();
    }
  },
  methods: {
    getCurrentProjectIdFromSession() {
      try {
        const user = JSON.parse(sessionStorage.getItem('user'));
        return user?.projectId || null;
      } catch (error) {
        console.error('Error getting projectId from session:', error);
        return null;
      }
    },

    showNotificationMessage(message, type = 'success') {
      this.notificationMessage = message;
      this.notificationType = type;
      this.showNotification = true;
    }
  }
}
</script>

<template>
  <div class="machinery-manager">
    <MachineryFormGeneral
        :project-id="currentProjectId"
        :readonly="true"
        :allow-editing="false"
    />

    <AppNotification
        v-model="showNotification"
        :message="notificationMessage"
        :type="notificationType"
        :auto-close="true"
        :duration="3000"
    />
  </div>
</template>

<style scoped>
.machinery-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}
</style>