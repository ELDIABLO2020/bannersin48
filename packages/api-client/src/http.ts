import type { ApiClientConfig, ApiError } from "./types";

export class ApiClientError extends Error {
  status: number;
  payload: ApiError | null;
  constructor(message: string, status: number, payload: ApiError | null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.payload = payload;
  }
}

/** Shared transport: bearer token from config, JSON or FormData bodies, ApiClientError on !ok. */
export class HttpClient {
  private baseUrl: string;
  private getToken?: () => string | null;
  private fetchImpl: typeof fetch;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.getToken = config.getToken;
    // Bind fetch — unbound `fetch` throws "Illegal invocation" in browsers.
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  protected async request<T>(
    method: string,
    path: string,
    body?: unknown,
    init?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    };
    const token = this.getToken?.();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    let bodyPayload: BodyInit | undefined;
    if (body !== undefined) {
      if (body instanceof FormData) {
        bodyPayload = body;
      } else {
        headers["Content-Type"] = "application/json";
        bodyPayload = JSON.stringify(body);
      }
    }

    const res = await this.fetchImpl(url, {
      method,
      headers,
      body: bodyPayload,
      credentials: "include",
      ...init,
    });

    if (!res.ok) {
      let payload: ApiError | null = null;
      try {
        payload = (await res.json()) as ApiError;
      } catch {
        // ignore parse errors
      }
      throw new ApiClientError(
        payload?.message ?? `${method} ${path} failed with ${res.status}`,
        res.status,
        payload,
      );
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
}
