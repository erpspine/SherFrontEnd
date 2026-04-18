import { getAuthorizationHeaderValue } from "./auth";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
    const {
        method = "GET",
        body,
        headers = {},
        withAuth = true,
        signal,
    } = options;

    const finalHeaders = {
        Accept: "application/json",
        ...headers,
    };

    if (!(body instanceof FormData) && body !== undefined) {
        finalHeaders["Content-Type"] = "application/json";
    }

    if (withAuth) {
        const authorizationHeader = getAuthorizationHeaderValue();
        if (authorizationHeader) {
            finalHeaders.Authorization = authorizationHeader;
        }
    }

    return fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: finalHeaders,
        body: body instanceof FormData || body === undefined ? body : JSON.stringify(body),
        signal,
    });
}
