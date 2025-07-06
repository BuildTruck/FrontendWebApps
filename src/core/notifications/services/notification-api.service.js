// notifications/services/notification-api.service.js
import http from "../../services/http.service.js";
import { Notification} from "../models/notification.entity.js";
import { NotificationSummary} from "../models/notification-summary.entity.js";

export const notificationApiService = {
    /**
     * Obtener notificaciones del usuario con filtros y paginación
     */
    async getNotifications(page = 1, size = 10, filters = {}) {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                size: size.toString()
            });

            // Agregar filtros opcionales
            if (filters.unread !== undefined) {
                params.append('unread', filters.unread.toString());
            }
            if (filters.context) {
                params.append('context', filters.context);
            }
            if (filters.projectId) {
                params.append('projectId', filters.projectId.toString());
            }

            const response = await http.get(`/notifications?${params.toString()}`);

            // Convertir respuesta a modelos
            const notifications = response.data.map(data => Notification.fromApiResponse(data));

            return {
                notifications,
                hasMore: notifications.length === size // Asumiendo que si devuelve el tamaño completo, hay más
            };
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw new Error('Error al cargar notificaciones');
        }
    },

    /**
     * Marcar una notificación específica como leída
     */
    async markAsRead(notificationId) {
        try {
            await http.post('/notifications/mark-read', {
                notificationId: notificationId
            });
            return true;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw new Error('Error al marcar notificación como leída');
        }
    },

    /**
     * Marcar múltiples notificaciones como leídas
     */
    async markMultipleAsRead(notificationIds) {
        try {
            await http.post('/notifications/mark-read', {
                notificationIds: notificationIds
            });
            return true;
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            throw new Error('Error al marcar notificaciones como leídas');
        }
    },

    /**
     * Marcar todas las notificaciones como leídas
     */
    async markAllAsRead() {
        try {
            // Primero obtenemos todas las notificaciones no leídas
            const { notifications } = await this.getNotifications(1, 100, { unread: true });
            const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);

            if (unreadIds.length > 0) {
                await this.markMultipleAsRead(unreadIds);
            }
            return true;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw new Error('Error al marcar todas las notificaciones como leídas');
        }
    },

    /**
     * Obtener resumen de notificaciones (contador, por contexto, etc.)
     */
    async getSummary() {
        try {
            const response = await http.get('/notifications/summary');
            return NotificationSummary.fromApiResponse(response.data);
        } catch (error) {
            console.error('Error fetching notification summary:', error);
            throw new Error('Error al cargar resumen de notificaciones');
        }
    },

    /**
     * Limpiar notificaciones antiguas
     */
    async cleanOldNotifications(daysOld = 30) {
        try {
            await http.delete('/notifications', {
                data: { daysOld }
            });
            return true;
        } catch (error) {
            console.error('Error cleaning old notifications:', error);
            throw new Error('Error al limpiar notificaciones antiguas');
        }
    },

    /**
     * Obtener notificaciones por proyecto (para managers/supervisores)
     */
    async getProjectNotifications(projectId, page = 1, size = 10) {
        try {
            return await this.getNotifications(page, size, { projectId });
        } catch (error) {
            console.error('Error fetching project notifications:', error);
            throw new Error('Error al cargar notificaciones del proyecto');
        }
    },

    /**
     * Obtener notificaciones por contexto
     */
    async getNotificationsByContext(context, page = 1, size = 10) {
        try {
            return await this.getNotifications(page, size, { context });
        } catch (error) {
            console.error('Error fetching notifications by context:', error);
            throw new Error(`Error al cargar notificaciones de ${context}`);
        }
    },

    /**
     * Obtener solo notificaciones no leídas
     */
    async getUnreadNotifications(page = 1, size = 10) {
        try {
            return await this.getNotifications(page, size, { unread: true });
        } catch (error) {
            console.error('Error fetching unread notifications:', error);
            throw new Error('Error al cargar notificaciones no leídas');
        }
    },

    /**
     * Buscar notificaciones por texto
     */
    async searchNotifications(query, page = 1, size = 10) {
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                size: size.toString(),
                search: query
            });

            const response = await http.get(`/notifications/search?${params.toString()}`);
            const notifications = response.data.map(data => Notification.fromApiResponse(data));

            return {
                notifications,
                hasMore: notifications.length === size
            };
        } catch (error) {
            console.error('Error searching notifications:', error);
            throw new Error('Error al buscar notificaciones');
        }
    },

    /**
     * Obtener estadísticas de notificaciones
     */
    async getStats() {
        try {
            const response = await http.get('/notifications/stats');
            return response.data;
        } catch (error) {
            console.error('Error fetching notification stats:', error);
            throw new Error('Error al cargar estadísticas de notificaciones');
        }
    },

    /**
     * Verificar si hay nuevas notificaciones (polling)
     */
    async checkForNew(lastCheckTime) {
        try {
            const params = new URLSearchParams();
            if (lastCheckTime) {
                params.append('since', lastCheckTime.toISOString());
            }

            const response = await http.get(`/notifications/check-new?${params.toString()}`);
            return {
                hasNew: response.data.hasNew || false,
                count: response.data.count || 0,
                notifications: (response.data.notifications || []).map(data => Notification.fromApiResponse(data))
            };
        } catch (error) {
            console.error('Error checking for new notifications:', error);
            return { hasNew: false, count: 0, notifications: [] };
        }
    }
};