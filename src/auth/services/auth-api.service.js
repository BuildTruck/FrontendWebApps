// auth-api.service.js
import http from '../../core/services/http.service'

export const AuthService = {
    // Variables para seguimiento del estado
    autoLogoutTimer: null,
    resetTimerHandler: null,
    lastActivity: null,
    timeoutMinutes: 60, // Valor por defecto

    /**
     * Limpia TODOS los almacenes de datos posibles del navegador
     * Esta es una limpieza agresiva para asegurar compatibilidad entre navegadores
     */
    clearAllStorages() {
        // Limpiar sessionStorage
        sessionStorage.clear();

        // Limpiar localStorage
        localStorage.clear();

        // Limpiar cookies (todas las cookies de este dominio)
        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        console.log('Todos los almacenamientos del navegador han sido limpiados');
    },

    async login(email, password) {
        // Limpiar TODOS los almacenamientos posibles
        this.clearAllStorages();

        const res = await http.get(`/users?email=${email}&password=${password}`)
        if (res.data.length === 0) {
            throw new Error('Credenciales inválidas')
        }

        // Activar el auto-logout (para pruebas: 10 segundos)
        this.setupAutoLogout(1/6);

        return res.data[0]
    },

    setupAutoLogout(timeoutMinutes = 60) {
        // Guardar el tiempo de timeout para uso posterior
        this.timeoutMinutes = timeoutMinutes;

        console.log(`Configurando auto-logout para ${timeoutMinutes} minutos (${timeoutMinutes * 60 * 1000}ms)`);

        // Registrar la hora actual como último momento de actividad
        this.lastActivity = new Date();

        // Limpiar cualquier temporizador existente
        if (this.autoLogoutTimer) {
            clearTimeout(this.autoLogoutTimer);
            console.log('Temporizador anterior eliminado');
        }

        // Convertir minutos a milisegundos
        const timeoutMs = timeoutMinutes * 60 * 1000;

        // Establecer temporizador de logout
        this.autoLogoutTimer = setTimeout(() => {
            console.log(`Auto-logout activado después de ${timeoutMinutes} minutos`);
            this.logout();
        }, timeoutMs);

        console.log('Temporizador de logout configurado:', this.autoLogoutTimer);

        // Remover los event listeners anteriores si existen
        this.removeEventListeners();

        // Crear una función para manejar la actividad del usuario
        this.resetTimerHandler = () => {
            // Solo reiniciar el temporizador si ha pasado al menos 1 segundo desde la última actividad
            const now = new Date();
            if ((now - this.lastActivity) > 1000) {  // 1 segundo en milisegundos
                console.log('Actividad detectada, reiniciando temporizador');
                this.lastActivity = now;

                // Limpiar el temporizador existente
                clearTimeout(this.autoLogoutTimer);

                // Crear un nuevo temporizador
                this.autoLogoutTimer = setTimeout(() => {
                    console.log(`Auto-logout activado después de ${this.timeoutMinutes} minutos de inactividad`);
                    this.logout();
                }, this.timeoutMinutes * 60 * 1000);
            }
        };

        // Añadir los event listeners para detectar actividad
        this.addEventListeners();
    },

    // Método separado para añadir event listeners
    addEventListeners() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        events.forEach(event => {
            document.addEventListener(event, this.resetTimerHandler, { passive: true });
        });

        console.log('Event listeners añadidos');
    },

    // Método separado para remover event listeners
    removeEventListeners() {
        if (this.resetTimerHandler) {
            const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

            events.forEach(event => {
                document.removeEventListener(event, this.resetTimerHandler);
            });

            console.log('Event listeners removidos');
        }
    },

    logout() {
        console.log('Ejecutando logout...');

        // Limpiar TODOS los almacenamientos posibles
        this.clearAllStorages();

        // Limpiar temporizador
        if (this.autoLogoutTimer) {
            clearTimeout(this.autoLogoutTimer);
            this.autoLogoutTimer = null;
            console.log('Temporizador de auto-logout eliminado');
        }

        // Eliminar event listeners
        this.removeEventListeners();
        this.resetTimerHandler = null;

        // Redireccionar a la página de login con un parámetro para forzar recarga
        window.location.href = '/login?fresh=' + new Date().getTime();
    },

    isAuthenticated() {
        return sessionStorage.getItem('token') !== null;
    },

    getCurrentUser() {
        const userData = sessionStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    }
}