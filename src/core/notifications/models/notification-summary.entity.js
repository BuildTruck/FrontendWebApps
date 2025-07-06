export class NotificationSummary {
    constructor(data = {}) {
        this.unreadCount = data.unreadCount || 0;
        this.byContext = data.byContext || {};
        this.lastUpdated = data.lastUpdated ? new Date(data.lastUpdated) : new Date();
        this.byPriority = data.byPriority || {};
        this.recentNotifications = data.recentNotifications || [];
    }

    // Getters para facilitar el uso
    get hasUnread() {
        return this.unreadCount > 0;
    }

    get displayCount() {
        return this.unreadCount > 99 ? '99+' : this.unreadCount.toString();
    }

    get contextSummary() {
        return Object.entries(this.byContext)
            .filter(([context, count]) => count > 0)
            .map(([context, count]) => ({
                context,
                count,
                displayName: this.getContextDisplayName(context),
                icon: this.getContextIcon(context)
            }));
    }

    get prioritySummary() {
        return Object.entries(this.byPriority)
            .filter(([priority, count]) => count > 0)
            .map(([priority, count]) => ({
                priority,
                count,
                displayName: this.getPriorityDisplayName(priority),
                color: this.getPriorityColor(priority)
            }));
    }

    get hasCritical() {
        return (this.byPriority.CRITICAL || 0) > 0;
    }

    get hasHigh() {
        return (this.byPriority.HIGH || 0) > 0;
    }

    get criticalCount() {
        return this.byPriority.CRITICAL || 0;
    }

    get highCount() {
        return this.byPriority.HIGH || 0;
    }

    // Métodos de utilidad
    getContextDisplayName(context) {
        const names = {
            'SYSTEM': 'Sistema',
            'PROJECTS': 'Proyectos',
            'PERSONNEL': 'Personal',
            'MATERIALS': 'Materiales',
            'MACHINERY': 'Maquinaria',
            'INCIDENTS': 'Incidentes'
        };
        return names[context] || context;
    }

    getContextIcon(context) {
        const icons = {
            'SYSTEM': 'pi pi-cog',
            'PROJECTS': 'pi pi-home',
            'PERSONNEL': 'pi pi-users',
            'MATERIALS': 'pi pi-inbox',
            'MACHINERY': 'pi pi-wrench',
            'INCIDENTS': 'pi pi-exclamation-triangle'
        };
        return icons[context] || 'pi pi-info-circle';
    }

    getPriorityDisplayName(priority) {
        const names = {
            'LOW': 'Baja',
            'NORMAL': 'Normal',
            'HIGH': 'Alta',
            'CRITICAL': 'Crítica'
        };
        return names[priority] || priority;
    }

    getPriorityColor(priority) {
        const colors = {
            'LOW': '#6c757d',
            'NORMAL': '#0d6efd',
            'HIGH': '#fd7e14',
            'CRITICAL': '#dc3545'
        };
        return colors[priority] || colors['NORMAL'];
    }

    getCountByContext(context) {
        return this.byContext[context] || 0;
    }

    getCountByPriority(priority) {
        return this.byPriority[priority] || 0;
    }

    // Métodos para actualizar contadores
    incrementContext(context) {
        this.byContext[context] = (this.byContext[context] || 0) + 1;
        this.unreadCount++;
        this.lastUpdated = new Date();
    }

    decrementContext(context) {
        if (this.byContext[context] > 0) {
            this.byContext[context]--;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
            this.lastUpdated = new Date();
        }
    }

    incrementPriority(priority) {
        this.byPriority[priority] = (this.byPriority[priority] || 0) + 1;
    }

    decrementPriority(priority) {
        if (this.byPriority[priority] > 0) {
            this.byPriority[priority]--;
        }
    }

    addNotification(notification) {
        this.incrementContext(notification.context);
        this.incrementPriority(notification.priority);

        // Agregar a notificaciones recientes (máximo 5)
        this.recentNotifications.unshift(notification);
        if (this.recentNotifications.length > 5) {
            this.recentNotifications = this.recentNotifications.slice(0, 5);
        }
    }

    markAsRead(notification) {
        this.decrementContext(notification.context);
        this.decrementPriority(notification.priority);

        // Remover de notificaciones recientes si está ahí
        this.recentNotifications = this.recentNotifications.filter(n => n.id !== notification.id);
    }

    markAllAsRead() {
        this.unreadCount = 0;
        this.byContext = {};
        this.byPriority = {};
        this.recentNotifications = [];
        this.lastUpdated = new Date();
    }

    // Método estático para crear desde API response
    static fromApiResponse(data) {
        return new NotificationSummary(data);
    }

    // Método para obtener badge color basado en prioridad más alta
    getBadgeColor() {
        if (this.hasCritical) return '#dc3545'; // Rojo para críticas
        if (this.hasHigh) return '#fd7e14';     // Naranja para altas
        if (this.hasUnread) return '#FF5F01';   // Color del sistema para normales
        return '#6c757d';                       // Gris para sin notificaciones
    }

    // Método para obtener el texto del badge
    getBadgeText() {
        if (!this.hasUnread) return '';
        return this.displayCount;
    }

    // Método para verificar si debe mostrar animación de alerta
    shouldAnimate() {
        return this.hasCritical || this.hasHigh;
    }
}