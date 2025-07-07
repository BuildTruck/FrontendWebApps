class NotificationSoundService {
    constructor() {
        this.sounds = {
            default: '/sounds/notification.mp3',
            success: '/sounds/notification.mp3',
            error: '/sounds/error.mp3',
            warning: '/sounds/warning.mp3',
        };

        // Cargar configuración desde localStorage
        this.enabled = this.loadSetting('notificationSoundsEnabled', true);
        this.volume = this.loadSetting('notificationSoundVolume', 0.7);
    }

    loadSetting(key, defaultValue) {
        const saved = localStorage.getItem(key);
        return saved !== null ? JSON.parse(saved) : defaultValue;
    }

    async playNotificationSound(priority = 'NORMAL') {

        if (!this.enabled) {
            return;
        }

        const soundType = this.getSoundTypeByPriority(priority);
        console.log('🎵 Tipo de sonido determinado:', soundType);

        await this.playSound(soundType);
    }

    getSoundTypeByPriority(priority) {
        console.log('🎯 getSoundTypeByPriority recibió:', priority, 'tipo:', typeof priority);

        switch (priority) {
            case 'CRITICAL': return 'error';
            case 'HIGH': return 'warning';
            case 'NORMAL': return 'success';
            case 'LOW': return 'default';
            default: return 'default';
        }
    }

    async playSound(type = 'default') {
        if (!this.enabled) return;

        try {
            // Usar una URL de audio online como fallback
            const soundUrl = this.sounds[type] || 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAbBTtzvfDEciUFLYDKn';

            const audio = new Audio(soundUrl);
            audio.volume = this.volume;
            await audio.play();
        } catch (error) {
            // Beep simple con Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.3);
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        localStorage.setItem('notificationSoundsEnabled', JSON.stringify(enabled));
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('notificationSoundVolume', JSON.stringify(this.volume));
    }

    getSettings() {
        return {
            enabled: this.enabled,
            volume: this.volume
        };
    }
}

export const notificationSoundService = new NotificationSoundService();