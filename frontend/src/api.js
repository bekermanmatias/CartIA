const API_ENDPOINT = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "");

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request(route, options = {}) {
  const query = options.query ? `?${new URLSearchParams(options.query)}` : "";
  const response = await fetch(`${API_ENDPOINT}/${route}${query}`, {
    credentials: "same-origin",
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(options.csrf ? { "X-CSRF-Token": options.csrf } : {}),
      ...options.headers,
    },
    method: options.method || "GET",
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await response.json().catch(() => ({ ok: false, error: "El servidor devolvió una respuesta inválida." }));
  if (!response.ok || data.ok === false) throw new ApiError(data.error || "No se pudo completar la operación.", response.status, data);
  return data;
}

export function getPublicParams() {
  const params = new URLSearchParams(window.location.search);
  return { restaurant: params.get("r") || "", tableToken: params.get("t") || "" };
}

export function getVisitorSession() {
  const key = "cartia-visitor-session";
  let value = window.sessionStorage.getItem(key);
  if (!value) {
    value = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(key, value);
  }
  return value;
}

export const cartiaApi = {
  health: () => request("health"),
  me: () => request("auth/me"),
  login: (email, password) => request("auth/login", { method: "POST", body: { email, password } }),
  logout: (csrf) => request("auth/logout", { method: "POST", csrf }),
  bootstrap: () => request("bootstrap"),
  publicMenu: ({ restaurant, tableToken }) => request("public/menu", {
    query: { r: restaurant, t: tableToken, v: getVisitorSession() },
  }),
  serviceRequest: ({ restaurant, tableToken, type }) => request("public/request", {
    method: "POST",
    body: { restaurant, tableToken, type, visitorSession: getVisitorSession() },
  }),
  order: ({ restaurant, tableToken, items, notes = "" }) => request("public/order", {
    method: "POST",
    body: { restaurant, tableToken, items, notes, visitorSession: getVisitorSession() },
  }),
  event: ({ restaurant, tableToken, ...event }) => request("public/event", {
    method: "POST",
    body: { restaurant, tableToken, visitorSession: getVisitorSession(), ...event },
  }),
  createTable: (label, csrf) => request("tables", { method: "POST", csrf, body: { label } }),
  archiveTable: (id, csrf) => request("tables/archive", { method: "POST", csrf, body: { id } }),
  requests: () => request("requests"),
  analytics: (days = 7) => request("analytics", { query: { days } }),
  resolveRequest: (item, csrf) => request("requests/resolve", {
    method: "POST", csrf, body: { id: item.id, kind: item.kind },
  }),
  saveSettings: (serviceOptions, visualTheme, csrf) => request("settings", {
    method: "POST", csrf, body: { serviceOptions, visualTheme },
  }),
  saveDish: (dish, csrf) => request("dishes/save", { method: "POST", csrf, body: dish }),
  uploadDishImage: (file, dishId, csrf) => {
    const form = new FormData();
    form.append("image", file);
    form.append("dishId", String(dishId));
    return request("images/upload", { method: "POST", csrf, body: form });
  },
  uploadLogo: (file, csrf) => {
    const form = new FormData();
    form.append("logo", file);
    return request("logo/upload", { method: "POST", csrf, body: form });
  },
  organizations: () => request("organizations"),
  createOrganization: (organization, csrf) => request("organizations", { method: "POST", csrf, body: organization }),
  organization: (id) => request(`organizations/${id}`),
  organizationUsers: (id) => request(`organizations/${id}/users`),
  createOrganizationUser: (id, user, csrf) => request(`organizations/${id}/users`, { method: "POST", csrf, body: user }),
  updateUser: (id, user, csrf) => request(`users/${id}`, { method: "PATCH", csrf, body: user }),
  selectLocation: (locationId, csrf) => request("auth/select-location", { method: "POST", csrf, body: { locationId } }),
  // Compatibility shape for the current admin screen while it migrates to organizations.
  restaurants: async () => {
    const data = await request("organizations");
    return { restaurants: data.organizations.flatMap((organization) => organization.locations.map((location) => ({ ...location, organizationId: organization.id, organizationName: organization.name, table_count: 0, dish_count: 0 }))) };
  },
  createRestaurant: async (restaurant, csrf) => {
    const data = await request("organizations", { method: "POST", csrf, body: { name: restaurant.restaurantName, locationName: restaurant.restaurantName, tagline: restaurant.tagline, ownerName: restaurant.adminName, ownerEmail: restaurant.email, ownerPassword: restaurant.password } });
    return { restaurant: { ...data.location, name: data.organization.name, slug: data.location.slug, status: "ACTIVE", table_count: 0, dish_count: 0 } };
  },
  uploadVideo(file, dish, metadata, csrf, onProgress) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append("video", file);
      form.append("dishId", String(dish.databaseId));
      if (metadata.duration) form.append("duration", String(metadata.duration));
      if (metadata.width) form.append("width", String(metadata.width));
      if (metadata.height) form.append("height", String(metadata.height));
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_ENDPOINT}/videos/upload`);
      xhr.withCredentials = true;
      xhr.setRequestHeader("X-CSRF-Token", csrf);
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
      });
      xhr.addEventListener("load", () => {
        let data;
        try { data = JSON.parse(xhr.responseText); } catch { data = { error: "El servidor devolvió una respuesta inválida." }; }
        if (xhr.status >= 200 && xhr.status < 300 && data.ok !== false) resolve(data);
        else reject(new ApiError(data.error || "No se pudo subir el video.", xhr.status, data));
      });
      xhr.addEventListener("error", () => reject(new ApiError("Se perdió la conexión durante la carga.", 0)));
      xhr.send(form);
    });
  },
};

export { ApiError };
