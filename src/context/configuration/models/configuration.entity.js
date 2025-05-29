export class Configuration {
    user_id;
    theme;
    plan;
    notifications_enable;
    email_notifications;

    constructor(data = {}) {
        this.user_id = data.user_id || '';
        this.theme = data.theme || 'light';
        this.plan = data.plan || 'basic';
        this.notifications_enable = typeof data.notifications_enable === 'string'
            ? data.notifications_enable
            : 'true';
        this.email_notifications = typeof data.email_notifications === 'string'
            ? data.email_notifications
            : 'false';
    }

    toJSON() {
        return {
            user_id: this.user_id,
            theme: this.theme,
            plan: this.plan,
            notifications_enable: this.notifications_enable,
            email_notifications: this.email_notifications
        };
    }
}
