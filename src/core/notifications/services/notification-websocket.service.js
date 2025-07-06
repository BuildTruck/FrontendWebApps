// notifications/services/notification-websocket.service.js
import * as signalR from '@microsoft/signalr';
import { AuthService} from "../../../auth/services/auth-api.service.js";
import { Notification} from "../models/notification.entity.js";

export class NotificationWebSocketService {
    constructor() {
        this.connection = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 3000;
        this.listeners = new Map();
        this.currentUserId = null;
        this.connectionPromise = null;
    }

    /**
     * Inicializar conexión WebSocket
     */
    async initialize() {
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = this._createConnection();
        return this.connectionPromise;
    }

    async _createConnection() {
        try {
            // Obtener token de autenticación
            const token = AuthService.getToken();
            const user = AuthService.getCurrentUser();

            if (!token || !user) {
                throw new Error('Usuario no autenticado');
            }

            this.currentUserId = user.id;

            // Crear conexión SignalR
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl(`${import.meta.env.VITE_API_BASE_URL}/hubs/notifications`, {
                    accessTokenFactory: () => token,
                    transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
                })
                .withAutomaticReconnect({
                    nextRetryDelayInMilliseconds: (retryContext) => {
                        if (retryContext.previousRetryCount < 3) {
                            return 3000; // 3 segundos
                        } else if (retryContext.previousRetryCount < 6) {
                            return 5000; // 5 segundos
                        } else {
                            return 10000; // 10 segundos
                        }
                    }
                })
                .configureLogging(signalR.LogLevel.Information)
                .build();

            // Configurar event handlers
            this._setupEventHandlers();

            // Iniciar conexión
            await this.connection.start();

            console.log('✅ NotificationHub conectado');
            this.isConnected = true;
            this.reconnectAttempts = 0;

            // Unirse al grupo del usuario
            await this.joinUserGroup();

            return this.connection;
        } catch (error) {
            console.error('❌ Error conectando NotificationHub:', error);
            this.isConnected = false;
            throw error;
        }
    }

    /**
     * Configurar event handlers del WebSocket
     */
    _setupEventHandlers() {
        if (!this.connection) return;

        // Evento de nueva notificación
        this.connection.on('NewNotification', (notificationData) => {
            console.log('🔔 Nueva notificación recibida:', notificationData);
            const notification = Notification.fromApiResponse(notificationData);
            this._emitEvent('newNotification', notification);
        });

        // Evento de actualización de contador no leídas
        this.connection.on('UnreadCountUpdate', (data) => {
            console.log('📊 Actualización contador no leídas:', data);
            this._emitEvent('unreadCountUpdate', data.unreadCount);
        });

        // Evento de notificación marcada como leída
        this.connection.on('NotificationRead', (data) => {
            console.log('✅ Notificación marcada como leída:', data);
            this._emitEvent('notificationRead', data.notificationId);
        });

        // Eventos de conexión
        this.connection.on('Connected', (data) => {
            console.log('🔗 Conectado a NotificationHub:', data);
            this._emitEvent('connected', data);
        });

        this.connection.on('JoinedUserGroup', (data) => {
            console.log('👥 Unido al grupo de usuario:', data);
            this._emitEvent('joinedUserGroup', data);
        });

        this.connection.on('JoinedProjectGroup', (data) => {
            console.log('🏗️ Unido al grupo de proyecto:', data);
            this._emitEvent('joinedProjectGroup', data);
        });

        // Eventos de ping/pong para mantener conexión viva
        this.connection.on('Pong', (data) => {
            console.log('🏓 Pong recibido:', data);
        });

        // Eventos de reconexión
        this.connection.onreconnecting((error) => {
            console.log('🔄 Reconectando NotificationHub...', error);
            this.isConnected = false;
            this._emitEvent('reconnecting', error);
        });

        this.connection.onreconnected((connectionId) => {
            console.log('✅ NotificationHub reconectado:', connectionId);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this._emitEvent('reconnected', connectionId);

            // Re-unirse a grupos después de reconexión
            this.joinUserGroup();
        });

        this.connection.onclose((error) => {
            console.log('❌ Conexión NotificationHub cerrada:', error);
            this.isConnected = false;
            this._emitEvent('disconnected', error);

            // Intentar reconectar manualmente si es necesario
            this._handleReconnect();
        });
    }

    /**
     * Unirse al grupo del usuario
     */
    async joinUserGroup() {
        if (!this.isConnected || !this.connection) return;

        try {
            await this.connection.invoke('JoinUserGroup');
            console.log('👥 Unido al grupo de usuario');
        } catch (error) {
            console.error('Error uniéndose al grupo de usuario:', error);
        }
    }

    /**
     * Salir del grupo del usuario
     */
    async leaveUserGroup() {
        if (!this.isConnected || !this.connection) return;

        try {
            await this.connection.invoke('LeaveUserGroup');
            console.log('👥 Salido del grupo de usuario');
        } catch (error) {
            console.error('Error saliendo del grupo de usuario:', error);
        }
    }

    /**
     * Unirse al grupo de un proyecto
     */
    async joinProjectGroup(projectId) {
        if (!this.isConnected || !this.connection) return;

        try {
            await this.connection.invoke('JoinProjectGroup', projectId);
            console.log(`🏗️ Unido al grupo del proyecto ${projectId}`);
        } catch (error) {
            console.error('Error uniéndose al grupo del proyecto:', error);
        }
    }

    /**
     * Salir del grupo de un proyecto
     */
    async leaveProjectGroup(projectId) {
        if (!this.isConnected || !this.connection) return;

        try {
            await this.connection.invoke('LeaveProjectGroup', projectId);
            console.log(`🏗️ Salido del grupo del proyecto ${projectId}`);
        } catch (error) {
            console.error('Error saliendo del grupo del proyecto:', error);
        }
    }

    /**
     * Marcar notificación como leída via WebSocket
     */
    async markNotificationAsRead(notificationId) {
        if (!this.isConnected || !this.connection) return;

        try {
            await this.connection.invoke('MarkNotificationAsRead', notificationId);
        } catch (error) {
            console.error('Error marcando notificación como leída:', error);
        }
    }

    /**
     * Solicitar contador de no leídas
     */
    async requestUnreadCount() {
        if (!this.isConnected || !this.connection) return;

        try {
            await this.connection.invoke('RequestUnreadCount');
        } catch (error) {
            console.error('Error solicitando contador de no leídas:', error);
        }
    }

    /**
     * Ping para mantener conexión viva
     */
    async ping() {
        if (!this.isConnected || !this.connection) return;

        try {
            await this.connection.invoke('Ping');
        } catch (error) {
            console.error('Error enviando ping:', error);
        }
    }

    /**
     * Manejar reconexión manual
     */
    async _handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Máximo número de intentos de reconexión alcanzado');
            this._emitEvent('maxReconnectAttemptsReached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`🔄 Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

        setTimeout(async () => {
            try {
                await this.initialize();
            } catch (error) {
                console.error('Error en reconexión:', error);
                this._handleReconnect();
            }
        }, this.reconnectDelay * this.reconnectAttempts);
    }

    /**
     * Agregar listener para eventos
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remover listener
     */
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emitir evento a listeners
     */
    _emitEvent(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error en listener de ${event}:`, error);
                }
            });
        }
    }

    /**
     * Desconectar WebSocket
     */
    async disconnect() {
        if (this.connection) {
            try {
                await this.leaveUserGroup();
                await this.connection.stop();
                console.log('❌ NotificationHub desconectado');
            } catch (error) {
                console.error('Error desconectando NotificationHub:', error);
            }
        }

        this.isConnected = false;
        this.connection = null;
        this.connectionPromise = null;
        this.currentUserId = null;
        this.listeners.clear();
    }

    /**
     * Obtener estado de la conexión
     */
    getConnectionState() {
        if (!this.connection) return 'Disconnected';

        const states = {
            0: 'Disconnected',
            1: 'Connecting',
            2: 'Connected',
            3: 'Disconnecting',
            4: 'Reconnecting'
        };

        return states[this.connection.state] || 'Unknown';
    }

    /**
     * Verificar si está conectado
     */
    get connected() {
        return this.isConnected && this.connection?.state === signalR.HubConnectionState.Connected;
    }
}

// Instancia singleton
export const notificationWebSocketService = new NotificationWebSocketService();