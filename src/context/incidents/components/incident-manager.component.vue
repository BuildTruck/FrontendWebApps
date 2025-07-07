<script>
import AppNotification from '../../../core/components/AppNotification.vue'
import IncidentForm from './incident-form.component.vue'
import { IncidentApiService } from "../services/incident-api.service.js";

export default {
  name: 'IncidentManager',
  components: {
    IncidentForm,
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
      incidentService: new IncidentApiService(),
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
  <div class="incident-manager">
    <IncidentForm
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
.incident-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}
</style>