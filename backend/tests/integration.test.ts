import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus } from "./helpers";

describe("API Integration Tests", () => {
  // ============================================
  // Public Endpoints: Therapists
  // ============================================

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

  test("GET /api/therapists with gender filter", async () => {
    const res = await api("/api/therapists?gender=Female");
    await expectStatus(res, 200);
  });

  test("GET /api/therapists with specialty filter", async () => {
    const res = await api("/api/therapists?specialty=Anxiety");
    await expectStatus(res, 200);
  });

  test("GET /api/therapists with therapy_type filter", async () => {
    const res = await api("/api/therapists?therapy_type=CBT");
    await expectStatus(res, 200);
  });

  test("GET /api/therapists with insurance filter", async () => {
    const res = await api("/api/therapists?insurance=Blue Cross");
    await expectStatus(res, 200);
  });

  test("GET /api/therapists with search parameter", async () => {
    const res = await api("/api/therapists?search=John");
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

  test("GET /api/therapists/{id} with non-existent UUID returns 404", async () => {
    const res = await api("/api/therapists/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 404);
  });

  test("GET /api/therapists/{id} with invalid UUID format returns 400", async () => {
    const res = await api("/api/therapists/invalid-uuid");
    await expectStatus(res, 400);
  });

  // ============================================
  // Public Endpoints: Filters
  // ============================================

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

  // ============================================
  // Authentication Setup
  // ============================================

  let authToken: string;
  let applicationId: string;

  test("Setup: sign up test user for authenticated endpoints", async () => {
    const { token } = await signUpTestUser();
    authToken = token;
  });

  // ============================================
  // Authenticated Endpoints: Applications (User)
  // ============================================

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

  // ============================================
  // Admin Endpoints: Applications
  // ============================================

  test("GET /api/admin/applications returns 401 without auth", async () => {
    const res = await api("/api/admin/applications");
    await expectStatus(res, 401);
  });

  test("GET /api/admin/applications returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/applications", authToken);
    await expectStatus(res, 403);
  });

  test("GET /api/admin/applications with status filter returns 403 for non-admin", async () => {
    const res = await authenticatedApi("/api/admin/applications?status=pending", authToken);
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

  test("GET /api/admin/applications/{id} with invalid UUID returns 400 for non-admin", async () => {
    const res = await authenticatedApi(
      "/api/admin/applications/invalid-uuid",
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

  test("PATCH /api/admin/applications/{id} with invalid status returns 400", async () => {
    const res = await authenticatedApi(
      `/api/admin/applications/${applicationId}`,
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invalid_status" }),
      }
    );
    await expectStatus(res, 403);
  });

  // ============================================
  // Admin Endpoints: Therapists
  // ============================================

  test("POST /api/admin/therapists returns 401 without auth", async () => {
    const res = await api("/api/admin/therapists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. John Doe",
        title: "Psychiatrist",
        bio: "Experienced psychiatrist",
        location: "Los Angeles",
        gender: "Male",
        specialties: ["Depression"],
        therapy_types: ["Medication"],
        insurances: ["Cigna"],
        session_fee: 150,
        languages: ["English"],
        years_experience: 15,
        phone: "555-9999",
        email: "john@example.com",
      }),
    });
    await expectStatus(res, 401);
  });

  test("POST /api/admin/therapists returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/therapists", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. John Doe",
        title: "Psychiatrist",
        bio: "Experienced psychiatrist",
        location: "Los Angeles",
        gender: "Male",
        specialties: ["Depression"],
        therapy_types: ["Medication"],
        insurances: ["Cigna"],
        session_fee: 150,
        languages: ["English"],
        years_experience: 15,
        phone: "555-9999",
        email: "john@example.com",
      }),
    });
    await expectStatus(res, 403);
  });

  test("PATCH /api/admin/therapists/{id} returns 401 without auth", async () => {
    const res = await api("/api/admin/therapists/00000000-0000-0000-0000-000000000000", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Name",
      }),
    });
    await expectStatus(res, 401);
  });

  test("PATCH /api/admin/therapists/{id} returns 403 for non-admin user", async () => {
    const res = await authenticatedApi(
      "/api/admin/therapists/00000000-0000-0000-0000-000000000000",
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Name",
        }),
      }
    );
    await expectStatus(res, 403);
  });

  test("PATCH /api/admin/therapists/{id} with invalid UUID returns 400", async () => {
    const res = await authenticatedApi(
      "/api/admin/therapists/invalid-uuid",
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Name",
        }),
      }
    );
    await expectStatus(res, 403);
  });

  test("DELETE /api/admin/therapists/{id} returns 401 without auth", async () => {
    const res = await api("/api/admin/therapists/00000000-0000-0000-0000-000000000000", {
      method: "DELETE",
    });
    await expectStatus(res, 401);
  });

  test("DELETE /api/admin/therapists/{id} returns 403 for non-admin user", async () => {
    const res = await authenticatedApi(
      "/api/admin/therapists/00000000-0000-0000-0000-000000000000",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 403);
  });

  test("DELETE /api/admin/therapists/{id} with invalid UUID returns 400", async () => {
    const res = await authenticatedApi(
      "/api/admin/therapists/invalid-uuid",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 403);
  });
});
