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

  // Authenticated endpoints tests
  let authToken: string;
  let applicationId: string;

  test("Setup: sign up test user for authenticated endpoints", async () => {
    const { token } = await signUpTestUser();
    authToken = token;
  });

  test("POST /api/applications returns 401 without auth", async () => {
    const res = await api("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Therapist",
        title: "Licensed Therapist",
        bio: "Test bio",
        location: "Test City",
        gender: "Female",
        specialties: ["Test"],
        therapy_types: ["CBT"],
        insurances: ["Insurance1"],
        session_fee: 100,
        languages: ["English"],
        years_experience: 5,
        phone: "555-0000",
        email: "test@example.com",
      }),
    });
    await expectStatus(res, 401);
  });

  test("POST /api/applications creates therapist application", async () => {
    const res = await authenticatedApi("/api/applications", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Jane Smith",
        title: "Licensed Clinical Psychologist",
        bio: "Experienced therapist specializing in anxiety disorders",
        location: "New York",
        gender: "Female",
        specialties: ["Anxiety", "Depression"],
        therapy_types: ["CBT", "DBT"],
        insurances: ["Blue Cross"],
        session_fee: 100,
        languages: ["English", "Spanish"],
        years_experience: 10,
        phone: "555-1234",
        email: "jane@example.com",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.status).toBeDefined();
    expect(data.name).toBe("Dr. Jane Smith");
    applicationId = data.id;
  });

  test("POST /api/applications returns 409 if user already has application", async () => {
    const res = await authenticatedApi("/api/applications", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Another Name",
        title: "Therapist",
        bio: "Another bio",
        location: "Boston",
        gender: "Male",
        specialties: ["OCD"],
        therapy_types: ["ERP"],
        insurances: ["Aetna"],
        session_fee: 120,
        languages: ["English"],
        years_experience: 8,
        phone: "555-5678",
        email: "another@example.com",
      }),
    });
    await expectStatus(res, 409);
  });

  test("GET /api/applications/me returns 401 without auth", async () => {
    const res = await api("/api/applications/me");
    await expectStatus(res, 401);
  });

  test("GET /api/applications/me returns current user's application", async () => {
    const res = await authenticatedApi("/api/applications/me", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toBeDefined();
  });

  test("GET /api/admin/applications returns 401 without auth", async () => {
    const res = await api("/api/admin/applications");
    await expectStatus(res, 401);
  });

  test("GET /api/admin/applications returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/applications", authToken);
    await expectStatus(res, 403);
  });

  test("GET /api/admin/applications/{id} returns 401 without auth", async () => {
    const res = await api("/api/admin/applications/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 401);
  });

  test("GET /api/admin/applications/{id} returns 403 for non-admin user", async () => {
    const res = await authenticatedApi(
      "/api/admin/applications/00000000-0000-0000-0000-000000000000",
      authToken
    );
    await expectStatus(res, 403);
  });

  test("PATCH /api/admin/applications/{id} returns 401 without auth", async () => {
    const res = await api("/api/admin/applications/00000000-0000-0000-0000-000000000000", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    await expectStatus(res, 401);
  });

  test("PATCH /api/admin/applications/{id} returns 403 for non-admin user", async () => {
    const res = await authenticatedApi(`/api/admin/applications/${applicationId}`, authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    await expectStatus(res, 403);
  });
});
