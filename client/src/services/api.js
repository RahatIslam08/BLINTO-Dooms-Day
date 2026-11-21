async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Request failed");
  return data;
}

export const api = {
  movies: {
    list: () => request("/api/movies"),
    create: (body) => request("/api/movies", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/api/movies/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id) => request(`/api/movies/${id}`, { method: "DELETE" }),
    rewatch: (id) => request(`/api/movies/${id}/rewatch-order`),
  },
  cinemas: {
    list: () => request("/api/cinemas"),
    create: (body) => request("/api/cinemas", { method: "POST", body: JSON.stringify(body) }),
    update: (id, body) => request(`/api/cinemas/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id) => request(`/api/cinemas/${id}`, { method: "DELETE" }),
    booking: (id, groupSize) => request(`/api/cinemas/${id}/booking?groupSize=${groupSize}`),
  },
};
