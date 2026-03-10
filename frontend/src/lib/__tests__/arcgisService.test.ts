import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchServicePoints, clearServiceCache } from "../arcgisService";

const POINT_FEATURE = {
  type: "Feature" as const,
  geometry: { type: "Point", coordinates: [-86.3, 32.37] },
  properties: {
    COMPANY_NA: "Test Clinic",
    ADDRESS: "123 Main St",
    PHONE: "334-555-0001",
  },
};

const GEOJSON_RESPONSE = { features: [POINT_FEATURE] };

function mockFetchSuccess(body: unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(body),
    })
  );
}

function mockFetchFailure(status: number): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: false, status })
  );
}

beforeEach(() => {
  clearServiceCache();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("fetchServicePoints", () => {
  it("returns ServicePoint array with correct shape for health category", async () => {
    mockFetchSuccess(GEOJSON_RESPONSE);

    const points = await fetchServicePoints("health");

    expect(points).toHaveLength(1);
    const point = points[0];
    expect(point.id).toBe("health-0");
    expect(point.category).toBe("health");
    expect(point.name).toBe("Test Clinic");
    expect(point.address).toBe("123 Main St");
    expect(point.phone).toBe("334-555-0001");
    expect(point.lat).toBeCloseTo(32.37);
    expect(point.lng).toBeCloseTo(-86.3);
  });

  it("returns empty array when response is not ok", async () => {
    mockFetchFailure(500);

    const points = await fetchServicePoints("health");

    expect(points).toEqual([]);
  });

  it("returns empty array when features array is missing", async () => {
    mockFetchSuccess({});

    const points = await fetchServicePoints("health");

    expect(points).toEqual([]);
  });

  it("filters out features with no valid geometry", async () => {
    mockFetchSuccess({
      features: [
        { type: "Feature", geometry: null, properties: { COMPANY_NA: "No Geo", ADDRESS: "Nowhere" } },
        POINT_FEATURE,
      ],
    });

    const points = await fetchServicePoints("health");

    expect(points).toHaveLength(1);
    expect(points[0].name).toBe("Test Clinic");
  });

  it("caches results and does not call fetch a second time", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(GEOJSON_RESPONSE),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchServicePoints("health");
    await fetchServicePoints("health");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caches each category independently", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(GEOJSON_RESPONSE),
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchServicePoints("health");
    await fetchServicePoints("parks");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns empty array and logs a warning when request times out", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_url: string, opts: RequestInit) =>
          new Promise((_, reject) => {
            opts.signal?.addEventListener("abort", () => {
              const err = new DOMException("Aborted", "AbortError");
              reject(err);
            });
          })
      )
    );

    const resultPromise = fetchServicePoints("health");
    vi.advanceTimersByTime(10_001);
    const points = await resultPromise;

    expect(points).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("timed out"),
      expect.any(String)
    );
  });

  it("re-throws non-abort errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Network failure"))
    );

    await expect(fetchServicePoints("health")).rejects.toThrow("Network failure");
  });

  it("computes centroid for polygon geometry", async () => {
    mockFetchSuccess({
      features: [
        {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
          },
          properties: { COMPANY_NA: "Poly Feature", ADDRESS: "1 Poly Ln" },
        },
      ],
    });

    const points = await fetchServicePoints("health");

    expect(points).toHaveLength(1);
    expect(points[0].lat).toBeCloseTo(0.8);
    expect(points[0].lng).toBeCloseTo(0.8);
  });
});
