export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";
export const APP_BASE_URL = import.meta.env.VITE_APP_BASE_URL ?? "http://localhost:5173";


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
