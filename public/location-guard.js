(function () {
  const restrictedPath = '/restricted-region.html';
  const homePath = '/';
  const currentPath = window.location.pathname;

  async function checkLocation() {
    try {
      const res = await fetch('https://ipinfo.io/json', {
        method: 'GET',
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error('Location API request failed');
      }

      const data = await res.json();
      const isAllowedRegion =
        data.country === 'IN' &&
        (data.region === 'Andhra Pradesh' || data.region === 'Telangana');

      if (isAllowedRegion) {
        if (currentPath === restrictedPath) {
          window.location.replace(homePath);
        }
        return;
      }

      if (currentPath !== restrictedPath) {
        window.location.replace(restrictedPath);
      }
    } catch (_error) {
      if (currentPath !== restrictedPath) {
        window.location.replace(restrictedPath);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkLocation, { once: true });
  } else {
    checkLocation();
  }
})();
