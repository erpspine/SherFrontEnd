const TOKEN_KEY = "auth_token";
const TOKEN_TYPE_KEY = "auth_token_type";
const USER_KEY = "auth_user";
const ROLES_KEY = "auth_roles";
const PERMISSIONS_KEY = "auth_permissions";

const ALL_KEYS = [TOKEN_KEY, TOKEN_TYPE_KEY, USER_KEY, ROLES_KEY, PERMISSIONS_KEY];
export const getAuthRoles = () => {
    for (const storage of storageList) {
        const raw = storage.getItem(ROLES_KEY);
        if (!raw) continue;
        try { return JSON.parse(raw) ?? []; } catch { return []; }
    }
    return [];
};

export const getAuthPermissions = () => {
    for (const storage of storageList) {
        const raw = storage.getItem(PERMISSIONS_KEY);
        if (!raw) continue;
        try { return JSON.parse(raw) ?? []; } catch { return []; }
    }
    return [];
};

export const hasPermission = (permission) => {
    if (!permission) return true;
    if (hasRole("Admin")) return true;
    return getAuthPermissions().includes(permission);
};

export const hasRole = (role) => getAuthRoles().includes(role);


const storageList = [window.localStorage, window.sessionStorage];

export const getAuthToken = () => {
    for (const storage of storageList) {
        const token = storage.getItem(TOKEN_KEY);
        if (token) return token;
    }
    return null;
};

export const getAuthTokenType = () => {
    for (const storage of storageList) {
        const tokenType = storage.getItem(TOKEN_TYPE_KEY);
        if (tokenType) return tokenType;
    }
    return "Bearer";
};

export const getAuthorizationHeaderValue = () => {
    const token = getAuthToken();
    if (!token) return null;
    return `${getAuthTokenType()} ${token}`;
};

export const getAuthUser = () => {
    for (const storage of storageList) {
        const rawUser = storage.getItem(USER_KEY);
        if (!rawUser) continue;

        try {
            return JSON.parse(rawUser);
        } catch {
            return null;
        }
    }
    return null;
};

export const isAuthenticated = () => Boolean(getAuthToken());

export const saveAuthSession = ({ token, tokenType, user, roles, permissions, rememberMe }) => {
    const targetStorage = rememberMe ? window.localStorage : window.sessionStorage;
    const otherStorage = rememberMe ? window.sessionStorage : window.localStorage;

    ALL_KEYS.forEach((k) => otherStorage.removeItem(k));

    targetStorage.setItem(TOKEN_KEY, token);
    targetStorage.setItem(TOKEN_TYPE_KEY, tokenType || "Bearer");
    targetStorage.setItem(USER_KEY, JSON.stringify(user || null));
    targetStorage.setItem(ROLES_KEY, JSON.stringify(roles || []));
    targetStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions || []));
};

export const clearAuthSession = () => {
    for (const storage of storageList) {
        ALL_KEYS.forEach((k) => storage.removeItem(k));
    }
};

/**
 * Refresh the user, roles, and permissions stored in the current session
 * without touching the token. Call this after the logged-in user's own
 * profile or role is edited.
 */
export const updateAuthSession = ({ user, roles, permissions }) => {
    for (const storage of storageList) {
        if (!storage.getItem(TOKEN_KEY)) continue;
        if (user !== undefined) storage.setItem(USER_KEY, JSON.stringify(user ?? null));
        if (roles !== undefined) storage.setItem(ROLES_KEY, JSON.stringify(roles ?? []));
        if (permissions !== undefined) storage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions ?? []));
        break;
    }
};
