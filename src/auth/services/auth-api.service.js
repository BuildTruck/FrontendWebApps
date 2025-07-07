// auth-api.service.js
import http from '../../core/services/http.service'

export const AuthService = {
    // Variables para seguimiento del estado
    autoLogoutTimer: null,
    resetTimerHandler: null,
    lastActivity: null,
    timeoutMinutes: 60,

    /**
     * Limpia TODOS los almacenes de datos posibles del navegador
     */
    clearAllStorages() {
        sessionStorage.clear();
        localStorage.clear();
        document.cookie.split(";").forEach(function (c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        console.log('Todos los almacenamientos del navegador han sido limpiados');
    },

    /**
     * Login usando el endpoint real de tu backend .NET
     */
    async login(email, password) {
        try {
            this.clearAllStorages();

            const response = await http.post('/auth/login', {
                email: email,
                password: password
            });

            const authData = response.data;

            sessionStorage.setItem('token', authData.token || authData);
            sessionStorage.setItem('user', JSON.stringify(authData.user || {email}));

            // NUEVO: Inicializar tema después del login
            try {
                const { useThemeStore } = await import('../../core/stores/theme.js');
                const themeStore = useThemeStore();
                await themeStore.initializeFromLogin();
                console.log('✅ Tema inicializado después del login');
            } catch (themeError) {
                console.error('Error inicializando tema:', themeError);
                // No bloquear el login si falla el tema
            }

            return authData.user || {email};
        } catch (error) {
            console.error('Error en login:', error);
            throw new Error(error.response?.data?.message || 'Credenciales inválidas');
        }
    },

    /**
     * Obtener información del usuario actual
     */
    async getCurrentUserInfo() {
        try {
            const response = await http.get('/auth/me');
            const userData = response.data;

            // Actualizar datos en sessionStorage
            sessionStorage.setItem('user', JSON.stringify(userData));

            return userData;
        } catch (error) {
            console.error('Error obteniendo datos del usuario:', error);
            this.logout();
            throw error;
        }
    },

    /**
     * Busca el proyecto asignado a un supervisor
     * @param {string|number} supervisorId - ID del supervisor
     * @returns {Promise} - Proyecto asignado o null
     */
    async getAssignedProject(supervisorId) {
        try {
            console.log('🔍 Buscando proyecto para supervisor:', supervisorId);
            const res = await http.get(`/projects/by-supervisor/${supervisorId}`);
            console.log('✅ Proyecto encontrado:', res.data);
            return res.data;
        } catch (error) {
            console.log('❌ No se encontró proyecto para el supervisor');
            return null;
        }
    },

    getToken() {
        return sessionStorage.getItem('token');
    },

    /**
     * Obtiene el usuario actual del sessionStorage
     */
    getCurrentUser() {
        try {
            const userStr = sessionStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error parsing user from sessionStorage:', error);
            return null;
        }
    },

    /**
     * Verifica si el usuario está autenticado
     */
    isAuthenticated() {
        return !!this.getToken() && !!this.getCurrentUser();
    },

    /**
     * Logout - limpia todo y redirige
     */
    logout() {
        this.clearAllStorages();

        // NUEVO: Reset del tema al hacer logout
        try {
            const { useThemeStore } = require('../../core/stores/theme.js');
            const themeStore = useThemeStore();
            themeStore.reset();
        } catch (error) {
            console.error('Error resetting theme:', error);
        }

        window.location.href = '/login';
    },

    /**
     * Refresh token si tu API lo soporta
     */
    async refreshToken() {
        try {
            const response = await http.post('/auth/refresh');
            const newToken = response.data.token;
            sessionStorage.setItem('token', newToken);
            return newToken;
        } catch (error) {
            console.error('Error refreshing token:', error);
            this.logout();
            throw error;
        }
    },
    async forgotPassword(email) {
        try {
            const response = await http.post('/auth/forgot-password', {
                email: email
            });

            return {
                success: true,
                message: response.data.message || 'Email enviado exitosamente'
            };
        } catch (error) {
            console.error('Error en forgot password:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Error al enviar email de recuperación'
            };
        }
    },

    async resetPassword(token, email, newPassword) {
        try {
            const response = await http.post('/auth/reset-password', {
                token: token,
                email: email,
                newPassword: newPassword
            });

            return {
                success: true,
                message: response.data.message || 'Contraseña restablecida exitosamente'
            };
        } catch (error) {
            console.error('Error en reset password:', error);
            throw error; // Re-throw para que el componente pueda manejar diferentes tipos de error
        }
    },
    async changePassword(id, currentPassword, newPassword) {
        try {
            const response = await http.put(`${this.basePath}/${id}/password`, {
                currentPassword,
                newPassword
            })
            return { success: true }
        } catch (error) {
            console.error('Error cambiando contraseña:', error)
            throw error
        }
    }
}