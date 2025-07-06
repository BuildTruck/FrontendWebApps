export class Notification {
    constructor(data = {}) {
        this.id = data.id || 0;
        this.userId = data.userId || 0;
        this.type = data.type || '';
        this.context = data.context || '';
        this.priority = data.priority || 'NORMAL';
        this.title = data.title || '';
        this.message = data.message || '';
        this.actionUrl = data.actionUrl || null;
        this.actionText = data.actionText || null;
        this.iconClass = data.iconClass || null;
        this.status = data.status || 'UNREAD';
        this.scope = data.scope || 'USER';
        this.targetRole = data.targetRole || '';
        this.relatedProjectId = data.relatedProjectId || null;
        this.relatedEntityId = data.relatedEntityId || null;
        this.relatedEntityType = data.relatedEntityType || null;
        this.isRead = data.isRead || false;
        this.readAt = data.readAt ? new Date(data.readAt) : null;
        this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    }

    // Getters para facilitar el uso
    get isUnread() {
        return !this.isRead;
    }

    get hasAction() {
        return !!this.actionUrl;
    }

    get priorityLevel() {
        const levels = { 'LOW': 1, 'NORMAL': 2, 'HIGH': 3, 'CRITICAL': 4 };
        return levels[this.priority] || 2;
    }

    get isHighPriority() {
        return this.priorityLevel >= 3;
    }

    get isCritical() {
        return this.priority === 'CRITICAL';
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
        return this.iconClass || icons[this.context] || 'pi pi-info-circle';
    }

    get priorityColor() {
        const colors = {
            'LOW': '#6c757d',
            'NORMAL': '#0d6efd',
            'HIGH': '#fd7e14',
            'CRITICAL': '#dc3545'
        };
        return colors[this.priority] || colors['NORMAL'];
    }

    get timeAgo() {
        const now = new Date();
        const diffMs = now - this.createdAt;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Ahora';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;

        return this.createdAt.toLocaleDateString();
    }

    // Métodos de utilidad
    markAsRead() {
        this.isRead = true;
        this.readAt = new Date();
        this.status = 'READ';
    }

    belongsToProject(projectId) {
        return this.relatedProjectId === projectId;
    }

    matchesContext(context) {
        return !context || this.context === context;
    }

    matchesPriority(minPriority) {
        if (!minPriority) return true;
        const levels = { 'LOW': 1, 'NORMAL': 2, 'HIGH': 3, 'CRITICAL': 4 };
        return levels[this.priority] >= levels[minPriority];
    }

    // Método estático para crear desde API response
    static fromApiResponse(data) {
        return new Notification(data);
    }

    // Método para convertir a objeto plano para API
    toApiPayload() {
        return {
            id: this.id,
            userId: this.userId,
            type: this.type,
            context: this.context,
            priority: this.priority,
            title: this.title,
            message: this.message,
            actionUrl: this.actionUrl,
            actionText: this.actionText,
            iconClass: this.iconClass,
            status: this.status,
            scope: this.scope,
            targetRole: this.targetRole,
            relatedProjectId: this.relatedProjectId,
            relatedEntityId: this.relatedEntityId,
            relatedEntityType: this.relatedEntityType,
            isRead: this.isRead
        };
    }
}