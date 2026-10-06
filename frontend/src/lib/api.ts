const apiBase = import.meta.env.VITE_API_BASE_URL?.trim();
const appBase = import.meta.env.VITE_APP_BASE_URL?.trim();

export const API_BASE_URL = apiBase || "http://localhost:8080";
export const APP_BASE_URL = appBase || "http://localhost:5173";


export function getCookie(name: string): string | null {
	const cookie = document.cookie
		.split("; ")
		.find((entry) => entry.startsWith(`${name}=`));

	return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null;
}

export async function initializeCsrf(): Promise<void> {
	await fetch(`${API_BASE_URL}/api/csrf`, {
		credentials: "include",
	});
}

/** Headers for a cookie-authenticated mutation: fetches the CSRF cookie first if it is missing. */
export async function csrfHeaders(): Promise<Record<string, string>> {
	if (!getCookie("XSRF-TOKEN")) {
		try {
			await initializeCsrf();
		} catch (error) {
			console.error("Could not initialize CSRF: ", error);
		}
	}

	const token = getCookie("XSRF-TOKEN");
	return token ? { "X-XSRF-TOKEN": token } : {};
}

/** Participant edit token saved by JoinForm, or null when the visitor never joined. */
export function readEditToken(tripId: string): string | null {
	try {
		return localStorage.getItem(`tripsync:editToken:${tripId}`);
	} catch {
		return null;
	}
}
