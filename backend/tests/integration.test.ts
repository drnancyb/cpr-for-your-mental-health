import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, connectWebSocket, connectAuthenticatedWebSocket, waitForMessage } from "./helpers";

describe("API Integration Tests", () => {
  test("GET /api/therapists lists therapists", async () => {
    const res = await api("/api/therapists");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.therapists)).toBe(true);
    expect(typeof data.total).toBe("number");
  });

  test("GET /api/therapists with location filter", async () => {
    const res = await api("/api/therapists?location=New York");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.therapists).toBeDefined();
  });

  test("GET /api/therapists with specialty filter", async () => {
    const res = await api("/api/therapists?specialty=Anxiety");
    await expectStatus(res, 200);
  });

  test("GET /api/therapists with multiple filters", async () => {
    const res = await api("/api/therapists?location=New York&gender=Female&therapy_type=CBT");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.therapists).toBeDefined();
  });

  test("GET /api/therapists/{id} with valid ID", async () => {
    const listRes = await api("/api/therapists");
    const { therapists } = await listRes.json();

    if (therapists.length > 0) {
      const therapistId = therapists[0].id;
      const res = await api(`/api/therapists/${therapistId}`);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.id).toBe(therapistId);
      expect(data.name).toBeDefined();
    }
  });

  test("GET /api/therapists/{id} with non-existent ID returns 404", async () => {
    const res = await api("/api/therapists/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 404);
  });

  test("GET /api/filters returns available filter options", async () => {
    const res = await api("/api/filters");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.locations)).toBe(true);
    expect(Array.isArray(data.genders)).toBe(true);
    expect(Array.isArray(data.specialties)).toBe(true);
    expect(Array.isArray(data.therapy_types)).toBe(true);
    expect(Array.isArray(data.insurances)).toBe(true);
  });
});
