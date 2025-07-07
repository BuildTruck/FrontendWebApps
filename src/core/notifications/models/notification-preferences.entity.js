export class NotificationPreference {
    constructor(data = {}) {
        this.id = data.id || 0;
        this.userId = data.userId || 0;
        this.context = data.context || 'SYSTEM';
        this.inAppEnabled = data.inAppEnabled !== undefined ? data.inAppEnabled : true;
        this.emailEnabled = data.emailEnabled !== undefined ? data.emailEnabled : false;
        this.minimumPriority = data.minimumPriority || 'NORMAL';
        this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    }

    // Getters para facilitar el uso
    get contextDisplayName() {
        const names = {
            'SYSTEM': 'Sistema',
            'PROJECTS': 'Proyectos',
            'PERSONNEL': 'Personal',
            'MATERIALS': 'Materiales',
            'MACHINERY': 'Maquinaria',
            'INCIDENTS': 'Incidentes'
        };
        return names[this.context] || this.context;
    }

    get contextIcon() {
        const icons = {
            'SYSTEM': 'pi pi-cog',
            'PROJECTS': 'pi pi-home',
            'PERSONNEL': 'pi pi-users',
            'MATERIALS': 'pi pi-inbox',
            'MACHINERY': 'pi pi-wrench',
            'INCIDENTS': 'pi pi-exclamation-triangle'
        };
        return icons[this.context] || 'pi pi-info-circle';
    }

    get priorityDisplayName() {
        const names = {
            'LOW': 'Baja',
            'NORMAL': 'Normal',
            'HIGH': 'Alta',
            'CRITICAL': 'Crítica'
        };
        return names[this.minimumPriority] || this.minimumPriority;
    }

    get isFullyDisabled() {
        return !this.inAppEnabled && !this.emailEnabled;
    }

    get isFullyEnabled() {
        return this.inAppEnabled && this.emailEnabled;
    }

    // Métodos para verificar si debe recibir notificación
    shouldReceiveInApp(priority) {
        if (!this.inAppEnabled) return false;
        return this.matchesPriority(priority);
    }

    shouldReceiveEmail(priority) {
        if (!this.emailEnabled) return false;
        return this.matchesPriority(priority);
    }

    shouldReceiveNotification(priority) {
        return this.shouldReceiveInApp(priority) || this.shouldReceiveEmail(priority);
    }

    matchesPriority(priority) {
        const levels = { 'LOW': 1, 'NORMAL': 2, 'HIGH': 3, 'CRITICAL': 4 };
        return levels[priority] >= levels[this.minimumPriority];
    }

    // Métodos de configuración
    enableInApp() {
        this.inAppEnabled = true;
    }

    disableInApp() {
        this.inAppEnabled = false;
    }

    enableEmail() {
        this.emailEnabled = true;
    }

    disableEmail() {
        this.emailEnabled = false;
    }

    enableAll() {
        this.inAppEnabled = true;
        this.emailEnabled = true;
    }

    disableAll() {
        this.inAppEnabled = false;
        this.emailEnabled = false;
    }

    setMinimumPriority(priority) {
        const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
        if (validPriorities.includes(priority)) {
            this.minimumPriority = priority;
        }
    }

    // Método estático para crear desde API response
    static fromApiResponse(data) {
        return new NotificationPreference(data);
    }

    // Método para convertir a objeto plano para API
    toApiPayload() {
        return {
            context: this.context,
            inAppEnabled: this.inAppEnabled,
            emailEnabled: this.emailEnabled,
            minimumPriority: this.minimumPriority
        };
    }

    // Método estático para crear preferencias por defecto
    static createDefaults(userId) {
        const contexts = ['SYSTEM', 'PROJECTS', 'PERSONNEL', 'MATERIALS', 'MACHINERY', 'INCIDENTS'];
        return contexts.map(context => new NotificationPreference({
            userId,
            context,
            inAppEnabled: true,
            emailEnabled: context === 'INCIDENTS' || context === 'SYSTEM', // Solo incidentes y sistema por email por defecto
            minimumPriority: context === 'INCIDENTS' ? 'HIGH' : 'NORMAL'
        }));
    }
}

// Clase para manejar todas las preferencias de un usuario
export class NotificationPreferences {
    constructor(preferences = []) {
        this.preferences = preferences.map(pref =>
            pref instanceof NotificationPreference ? pref : new NotificationPreference(pref)
        );
    }

    // Obtener preferencia por contexto
    getByContext(context) {
        return this.preferences.find(pref => pref.context === context) || null;
    }

    // Verificar si debe recibir notificación
    shouldReceive(context, priority, channel = 'inApp') {
        const preference = this.getByContext(context);
        if (!preference) return false;

        return channel === 'email'
            ? preference.shouldReceiveEmail(priority)
            : preference.shouldReceiveInApp(priority);
    }

    // Obtener todos los contextos habilitados
    getEnabledContexts(channel = 'inApp') {
        return this.preferences
            .filter(pref => channel === 'email' ? pref.emailEnabled : pref.inAppEnabled)
            .map(pref => pref.context);
    }

    // Actualizar preferencia
    updatePreference(context, updates) {
        const preference = this.getByContext(context);
        if (preference) {
            Object.assign(preference, updates);
        }
    }

    // Habilitar/deshabilitar todo
    enableAll() {
        this.preferences.forEach(pref => pref.enableAll());
    }

    disableAll() {
        this.preferences.forEach(pref => pref.disableAll());
    }

    // Convertir a array para API
    toApiPayload() {
        return this.preferences.map(pref => pref.toApiPayload());
    }

    // Método estático para crear desde API response
    static fromApiResponse(data) {
        return new NotificationPreferences(data);
    }
}