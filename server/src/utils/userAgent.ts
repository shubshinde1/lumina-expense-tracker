export interface ParsedUA {
  deviceType: "Mobile" | "Tablet" | "Desktop";
  browserName: string;
  os: string;
}

export const parseUserAgent = (uaString: string | undefined): ParsedUA => {
  if (!uaString) {
    return { deviceType: "Desktop", browserName: "Unknown Browser", os: "Unknown OS" };
  }

  const ua = uaString.toLowerCase();
  
  // 1. Device Type
  let deviceType: "Mobile" | "Tablet" | "Desktop" = "Desktop";
  if (ua.includes("ipad") || (ua.includes("android") && !ua.includes("mobile"))) {
    deviceType = "Tablet";
  } else if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("ipod") || ua.includes("android")) {
    deviceType = "Mobile";
  }

  // 2. OS
  let os = "Unknown OS";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("macintosh") || ua.includes("mac os") || ua.includes("intel mac")) os = "macOS";
  else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) os = "iOS";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("linux")) os = "Linux";

  // 3. Browser / Client App
  let browserName = "Unknown Browser";
  if (ua.includes("capacitor") || ua.includes("wv")) browserName = "Mobile App";
  else if (ua.includes("chrome") && !ua.includes("chromium") && !ua.includes("edg") && !ua.includes("opr")) browserName = "Chrome";
  else if (ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium")) browserName = "Safari";
  else if (ua.includes("firefox") && !ua.includes("seamonkey")) browserName = "Firefox";
  else if (ua.includes("edg")) browserName = "Edge";
  else if (ua.includes("opr") || ua.includes("opera")) browserName = "Opera";

  return { deviceType, browserName, os };
};
