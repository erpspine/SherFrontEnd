const TOKEN_KEY = "auth_token";
const TOKEN_TYPE_KEY = "auth_token_type";
const USER_KEY = "auth_user";

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

export const saveAuthSession = ({ token, tokenType, user, rememberMe }) => {
    const targetStorage = rememberMe ? window.localStorage : window.sessionStorage;
    const otherStorage = rememberMe ? window.sessionStorage : window.localStorage;

    otherStorage.removeItem(TOKEN_KEY);
    otherStorage.removeItem(TOKEN_TYPE_KEY);
    otherStorage.removeItem(USER_KEY);

    targetStorage.setItem(TOKEN_KEY, token);
    targetStorage.setItem(TOKEN_TYPE_KEY, tokenType || "Bearer");
    targetStorage.setItem(USER_KEY, JSON.stringify(user || null));
};

export const clearAuthSession = () => {
    for (const storage of storageList) {
        storage.removeItem(TOKEN_KEY);
        storage.removeItem(TOKEN_TYPE_KEY);
        storage.removeItem(USER_KEY);
    }
};
