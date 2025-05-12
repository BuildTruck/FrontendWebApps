// configuration.entity.js
export class Configuration {
    language
    theme
    plan

    constructor(data = {}) {
        this.language = data.language || 'es'
        this.theme = data.theme || 'light'
        this.plan = data.plan || 'basic'
    }

    toJSON() {
        return {
            language: this.language,
            theme: this.theme,
            plan: this.plan
        }
    }
}
