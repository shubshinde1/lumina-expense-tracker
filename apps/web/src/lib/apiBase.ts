export const PRODUCTION_API_URL = "https://lumina-expense-tracker-85ym.vercel.app/api";
export const LOCAL_API_URL = "http://localhost:5001/api";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const customUrl = localStorage.getItem("custom_api_url");
    if (customUrl) return customUrl;
  }

  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // `next dev` is localhost with a port. Capacitor and the deployed site are not.
  if (typeof window !== "undefined") {
    const isLocalDevServer = window.location.hostname === "localhost" && Boolean(window.location.port);
    if (isLocalDevServer) return LOCAL_API_URL;
  }

  return PRODUCTION_API_URL;
}
