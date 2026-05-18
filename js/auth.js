(function () {
  const TOKEN_KEY = 'token';

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  }

  function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  }

  function setToken(token, { remember = false } = {}) {
    clearToken();

    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  }

  function hasToken() {
    return !!getToken();
  }

  window.AppAuth = {
    getToken,
    setToken,
    clearToken,
    hasToken,
  };
})();
