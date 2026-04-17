function logoutAdmin() {
  localStorage.removeItem('adminAccessToken');
  localStorage.removeItem('adminUser');
  window.location.href = '/admin';
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', logoutAdmin);
}