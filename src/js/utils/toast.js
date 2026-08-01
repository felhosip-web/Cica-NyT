export function showToast(msg, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }

    // Alapvető stílusok, amik mindig kellenek
    let baseClass = 'fixed bottom-20 left-1/2 transform -translate-x-1/2 text-white px-4 py-2 rounded shadow-lg z-[100] transition-opacity duration-300';

    // Típusfüggő háttérszín
    let bgClass = 'bg-gray-800'; // alapértelmezett info
    if (type === 'warning') {
        bgClass = 'bg-yellow-600';
    } else if (type === 'error') {
        bgClass = 'bg-red-600';
    }

    toast.className = `${baseClass} ${bgClass}`;
    toast.textContent = msg;
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}
