const API_URL = "http://localhost:8000/api/v1";

export async function loginApi(email, password, role) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role })
  });
  if (!response.ok) {
    throw new Error("Credenciales inválidas");
  }
  return response.json();
}

export async function registerApi(email, password) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || "Error en el registro");
  }
  return response.json();
}

export async function analyzeTextApi(text, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_URL}/analyze/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text })
  });
  if (!response.ok) {
    if (response.status === 402) {
      const limitErr = await response.json();
      throw { name: "PlanLimitExceededError", ...limitErr.detail };
    }
    throw new Error("Error en el análisis de texto");
  }
  return response.json();
}

export async function getHistoryApi(token) {
  const response = await fetch(`${API_URL}/analyze/history`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Error al obtener historial");
  }
  return response.json();
}

export async function autosaveApi(text, token) {
  const response = await fetch(`${API_URL}/analyze/autosave`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ text })
  });
  if (!response.ok) {
    throw new Error("Error al guardar versión");
  }
  return response.json();
}

export async function getDraftsApi(token) {
  const response = await fetch(`${API_URL}/analyze/versions`, {
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error("Error al obtener borradores");
  }
  return response.json();
}
