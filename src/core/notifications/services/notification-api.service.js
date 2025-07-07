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
            console.log('🔄 Marcando múltiples notificaciones:', notificationIds);

            await http.post('/notifications/mark-read', {
                notificationIds: notificationIds  // ← Formato correcto según tu schema
            });

            console.log('✅ Notificaciones múltiples marcadas como leídas');
            return true;
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            console.error('Error details:', error.response?.data);
            throw new Error('Error al marcar notificaciones como leídas');
        }
    },

    /**
     * Marcar todas las notificaciones como leídas
     */
    async markAllAsRead() {
        try {
            console.log('🔄 Iniciando markAllAsRead...');

            const { notifications } = await this.getNotifications(1, 1000, { unread: true });
            console.log('📊 Notificaciones no leídas encontradas:', notifications.length);

            if (notifications.length === 0) {
                console.log('✅ No hay notificaciones para marcar');
                return true;
            }

            const unreadIds = notifications.map(n => n.id);
            console.log('🏷️ IDs a marcar como leídas:', unreadIds);

            // AGREGAR DEBUG COMPLETO
            console.log('📤 Enviando request al backend...');
            const payload = { notificationIds: unreadIds };
            console.log('📦 Payload enviado:', payload);

            const response = await http.post('/notifications/mark-read', payload);

            // VER QUÉ RESPONDE EL BACKEND
            console.log('📥 Respuesta del backend:', response);
            console.log('📥 Status:', response.status);
            console.log('📥 Data:', response.data);

            // VERIFICAR SI REALMENTE SE MARCARON
            console.log('🔍 Verificando si se marcaron...');
            await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo

            const checkSummary = await this.getSummary();
            console.log('📊 Summary después de marcar:', {
                unreadCount: checkSummary.unreadCount,
                byPriority: checkSummary.byPriority,
                byContext: checkSummary.byContext
            });

            if (checkSummary.unreadCount === 0) {
                console.log('🎉 ¡Éxito! Todas marcadas como leídas');
            } else {
                console.log('❌ Fallo: Aún hay', checkSummary.unreadCount, 'no leídas');
            }

            return true;
        } catch (error) {
            console.error('❌ Error completo:', error);
            console.error('❌ Error response:', error.response);
            console.error('❌ Error data:', error.response?.data);
            console.error('❌ Error status:', error.response?.status);
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