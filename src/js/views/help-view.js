export async function renderChangelog() {
    const changelogContainer = document.getElementById('changelog-container');
    if (!changelogContainer) return;

    try {
        const response = await fetch(import.meta.env.BASE_URL + 'changelog.json');
        if (response.ok) {
            const changelog = await response.json();

            let html = '<div class="space-y-6">';

            changelog.forEach(release => {
                let changesHtml = release.changes.map(change => `<li class="text-gray-600 text-sm ml-4 list-disc">${change}</li>`).join('');
                html += `
                <div class="relative pl-4 border-l-2 border-brand-pink">
                    <div class="absolute w-3 h-3 bg-brand-pink rounded-full -left-[7px] top-1.5"></div>
                    <div class="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-2">
                        <h4 class="text-md font-bold text-gray-800">v${release.version}</h4>
                        <span class="text-xs text-gray-500">${release.date}</span>
                    </div>
                    <ul class="space-y-1">
                        ${changesHtml}
                    </ul>
                </div>
                `;
            });

            html += '</div>';
            changelogContainer.innerHTML = html;
        }
    } catch (error) {
        console.error('Failed to load changelog', error);
        changelogContainer.innerHTML = '<p class="text-gray-500 text-sm">Changelog betöltése sikertelen.</p>';
    }
}
