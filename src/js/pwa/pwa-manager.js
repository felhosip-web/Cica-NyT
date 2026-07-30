export class PwaManager {
    constructor() {
        this.versionData = null;
        this.updateInterval = 1000 * 60 * 60; // 1 hour
    }

    async init() {
        if ('serviceWorker' in navigator) {
            try {
                // A simple placeholder for PWA registration if we add a service worker later
                // For now, version check is enough for basic auto-update
            } catch (error) {
                console.error('SW registration failed:', error);
            }
        }

        await this.checkForUpdates();
        setInterval(() => this.checkForUpdates(), this.updateInterval);
    }

    async checkForUpdates() {
        try {
            const currentVersion = localStorage.getItem('appVersion');
            const response = await fetch('/version.json?t=' + new Date().getTime());
            if (!response.ok) return;

            const data = await response.json();
            this.versionData = data;

            if (currentVersion !== data.version) {
                if (!currentVersion) {
                    localStorage.setItem('appVersion', data.version);
                } else {
                    this.showUpdateBanner(data.version);
                }
            }
        } catch (error) {
            console.error('Failed to check for updates', error);
        }
    }

    showUpdateBanner(newVersion) {
        const banner = document.getElementById('pwa-update-banner');
        const btn = document.getElementById('pwa-update-btn');
        if (banner && btn) {
            banner.classList.remove('hidden');
            btn.onclick = () => {
                localStorage.setItem('appVersion', newVersion);
                window.location.reload(true);
            };
        }
    }
}

export const pwaManager = new PwaManager();
