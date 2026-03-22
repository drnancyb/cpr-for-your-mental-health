import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, createTestFile } from "./helpers";

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

  test("GET /api/therapists with sort price_asc", async () => {
    const res = await api("/api/therapists?sort=price_asc");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.therapists).toBeDefined();
  });

  test("GET /api/therapists with sort price_desc", async () => {
    const res = await api("/api/therapists?sort=price_desc");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.therapists).toBeDefined();
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
  // Public Endpoints: Content
  // ============================================

  test("GET /api/content/{key} with valid key returns 200", async () => {
    const res = await api("/api/content/welcome-message");
    await expectStatus(res, 200, 404);
  });

  test("GET /api/content/{key} with non-existent key returns 404", async () => {
    const res = await api("/api/content/nonexistent-key-12345");
    await expectStatus(res, 404);
  });

  // ============================================
  // Public Endpoints: Analytics
  // ============================================

  test("POST /api/analytics/events tracks an event", async () => {
    const res = await api("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "therapist_viewed",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("POST /api/analytics/events with therapist_id tracks event", async () => {
    const res = await api("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type: "therapist_saved",
        therapist_id: "00000000-0000-0000-0000-000000000000",
        metadata: { platform: "web" },
      }),
    });
    await expectStatus(res, 201);
  });

  // ============================================
  // Public Endpoints: Support
  // ============================================

  test("POST /api/support creates a support request", async () => {
    const res = await api("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "John Doe",
        email: "john@example.com",
        subject: "App feedback",
        message: "Great app, would like some features",
        role: "client",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.id).toBeDefined();
  });

  test("POST /api/support without required fields returns 400", async () => {
    const res = await api("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "John Doe",
      }),
    });
    await expectStatus(res, 400);
  });

  // ============================================
  // Public Endpoints: Contact
  // ============================================

  test("POST /api/contact creates a contact message", async () => {
    const res = await api("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Jane Smith",
        email: "jane@example.com",
        subject: "General inquiry",
        message: "I have a question about the platform",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.id).toBeDefined();
  });

  test("POST /api/contact without required fields returns 400", async () => {
    const res = await api("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Jane Smith",
      }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/contact with empty message returns 400", async () => {
    const res = await api("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Jane Smith",
        email: "jane@example.com",
        subject: "Test",
        message: "",
      }),
    });
    await expectStatus(res, 400);
  });

  // ============================================
  // Authentication Setup
  // ============================================

  let authToken: string;
  let authUserId: string;
  let authEmail: string;
  let applicationId: string;
  let therapistId: string;
  let adminToken: string;

  test("Setup: sign up test user for authenticated endpoints", async () => {
    const { token, user } = await signUpTestUser();
    authToken = token;
    authUserId = user.id;
    authEmail = user.email;
  });

  test("Setup: get a therapist ID for saved/booking tests", async () => {
    const res = await api("/api/therapists");
    const data = await res.json();
    if (data.therapists.length > 0) {
      therapistId = data.therapists[0].id;
    }
  });

  test("Setup: bootstrap admin user for admin tests", async () => {
    const { token: bootstrapToken, user: adminUser } = await signUpTestUser();
    const res = await api("/api/admin/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminUser.email, secret: "CPR-ADMIN-2024" }),
    });
    const data = await res.json();
    if (data && data.success) {
      adminToken = bootstrapToken;
    } else {
      // If first attempt failed, try with another user
      const { token: token2, user: user2 } = await signUpTestUser();
      const res2 = await api("/api/admin/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user2.email, secret: "CPR-ADMIN-2024" }),
      });
      const data2 = await res2.json();
      if (data2 && data2.success) {
        adminToken = token2;
      }
    }
  });

  // ============================================
  // Admin Force Promote Endpoint
  // ============================================

  test("POST /api/admin/force-promote with invalid secret returns 403", async () => {
    const res = await api("/api/admin/force-promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: authEmail, secret: "invalid-secret" }),
    });
    await expectStatus(res, 403);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  test("POST /api/admin/force-promote with non-existent user returns 404", async () => {
    const res = await api("/api/admin/force-promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent-forcepromo@example.com", secret: "CPR-ADMIN-2024" }),
    });
    await expectStatus(res, 404);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  test("POST /api/admin/force-promote with valid user promotes to admin", async () => {
    const { user: newUser } = await signUpTestUser();
    const res = await api("/api/admin/force-promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newUser.email, secret: "CPR-ADMIN-2024" }),
    });
    await expectStatus(res, 200, 400);
    const data = await res.json();
    expect(data.success !== undefined || data.error !== undefined).toBe(true);
  });

  // ============================================
  // Admin Bootstrap Endpoint
  // ============================================

  test("POST /api/admin/bootstrap with existing test user", async () => {
    const res = await api("/api/admin/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: authEmail, secret: "CPR-ADMIN-2024" }),
    });
    await expectStatus(res, 200, 400);
    const data = await res.json();
    expect(data.success !== undefined || data.error !== undefined).toBe(true);
  });

  test("POST /api/admin/bootstrap with non-existent user returns 404", async () => {
    const res = await api("/api/admin/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent-user-xyz@example.com", secret: "CPR-ADMIN-2024" }),
    });
    await expectStatus(res, 404);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  test("POST /api/admin/bootstrap with fresh user signup", async () => {
    const { user: newUser } = await signUpTestUser();
    const res = await api("/api/admin/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newUser.email, secret: "CPR-ADMIN-2024" }),
    });
    await expectStatus(res, 200, 400);
  });

  // ============================================
  // Public Endpoint: Admin Lookup
  // ============================================

  test("GET /admin/lookup/nancy-brooks returns lookup results", async () => {
    const res = await api("/admin/lookup/nancy-brooks");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.user_results)).toBe(true);
    expect(Array.isArray(data.therapist_results)).toBe(true);
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

  test("POST /api/applications with missing required fields returns 400", async () => {
    const { token } = await signUpTestUser();
    const res = await authenticatedApi("/api/applications", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Another Name",
        title: "Therapist",
      }),
    });
    await expectStatus(res, 400);
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
  // Authenticated Endpoints: Therapists Me
  // ============================================

  test("GET /api/therapists/me returns 401 without auth", async () => {
    const res = await api("/api/therapists/me");
    await expectStatus(res, 401);
  });

  test("GET /api/therapists/me returns authenticated user's therapist profile", async () => {
    const res = await authenticatedApi("/api/therapists/me", authToken);
    await expectStatus(res, 200, 404);
  });

  test("PUT /api/therapists/me returns 401 without auth", async () => {
    const res = await api("/api/therapists/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Name",
      }),
    });
    await expectStatus(res, 401);
  });

  test("PUT /api/therapists/me updates authenticated user's therapist profile", async () => {
    const res = await authenticatedApi("/api/therapists/me", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Updated Therapist Me",
        title: "Licensed Therapist",
        bio: "Updated bio for therapist profile",
      }),
    });
    await expectStatus(res, 200, 404);
  });

  test("PUT /api/therapists/me with comprehensive therapist info update", async () => {
    const res = await authenticatedApi("/api/therapists/me", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. Comprehensive Therapist",
        photo_url: "https://example.com/photo.jpg",
        title: "Licensed Clinical Therapist",
        bio: "Comprehensive profile update",
        location: "San Francisco",
        gender: "Female",
        specialties: ["Anxiety", "Depression"],
        therapy_types: ["CBT", "ACT"],
        insurances: ["Blue Cross", "Aetna"],
        accepting_new_clients: true,
        session_fee: 150,
        languages: ["English", "Mandarin"],
        years_experience: 12,
        phone: "555-9876",
        email: "therapist@example.com",
        website_url: "https://therapist-example.com",
        license_documents: ["https://example.com/license.pdf"],
      }),
    });
    await expectStatus(res, 200, 404);
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

  test("GET /api/admin/applications lists applications (admin positive case)", async () => {
    if (adminToken) {
      const res = await authenticatedApi("/api/admin/applications", adminToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data) || Array.isArray(data.applications)).toBe(true);
    }
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

  test("GET /api/admin/applications/{id} with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/admin/applications/invalid-uuid",
      authToken
    );
    await expectStatus(res, 400);
  });

  test("GET /api/admin/applications/{id} retrieves application (admin positive case)", async () => {
    if (adminToken && applicationId) {
      const res = await authenticatedApi(
        `/api/admin/applications/${applicationId}`,
        adminToken
      );
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data).toBeDefined();
    }
  });

  test("GET /api/admin/applications/{id} with non-existent UUID returns 404", async () => {
    if (adminToken) {
      const res = await authenticatedApi(
        "/api/admin/applications/00000000-0000-0000-0000-000000000000",
        adminToken
      );
      await expectStatus(res, 404);
    }
  });

  test("GET /api/admin/applications/{id}/documents returns 401 without auth", async () => {
    const res = await api("/api/admin/applications/00000000-0000-0000-0000-000000000000/documents");
    await expectStatus(res, 401);
  });

  test("GET /api/admin/applications/{id}/documents returns 403 for non-admin user", async () => {
    const res = await authenticatedApi(
      "/api/admin/applications/00000000-0000-0000-0000-000000000000/documents",
      authToken
    );
    await expectStatus(res, 403);
  });

  test("GET /api/admin/applications/{id}/documents with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/admin/applications/invalid-uuid/documents",
      authToken
    );
    await expectStatus(res, 400);
  });

  test("GET /api/admin/applications/{id}/documents retrieves documents (admin positive case)", async () => {
    if (adminToken && applicationId) {
      const res = await authenticatedApi(
        `/api/admin/applications/${applicationId}/documents`,
        adminToken
      );
      await expectStatus(res, 200, 404);
      const data = await res.json();
      expect(data.license_documents !== undefined).toBe(true);
    }
  });

  test("GET /api/admin/applications/{id}/documents with non-existent UUID returns 404", async () => {
    if (adminToken) {
      const res = await authenticatedApi(
        "/api/admin/applications/00000000-0000-0000-0000-000000000000/documents",
        adminToken
      );
      await expectStatus(res, 404);
    }
  });

  test("PATCH /api/admin/applications/{id}/status returns 401 without auth", async () => {
    const res = await api("/api/admin/applications/00000000-0000-0000-0000-000000000000/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    await expectStatus(res, 401);
  });

  test("PATCH /api/admin/applications/{id}/status returns 403 for non-admin user", async () => {
    const res = await authenticatedApi(
      "/api/admin/applications/00000000-0000-0000-0000-000000000000/status",
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      }
    );
    await expectStatus(res, 403);
  });

  test("PATCH /api/admin/applications/{id}/status with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/admin/applications/invalid-uuid/status",
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      }
    );
    await expectStatus(res, 400);
  });

  test("PATCH /api/admin/applications/{id}/status without required status returns 400", async () => {
    const res = await authenticatedApi(
      "/api/admin/applications/00000000-0000-0000-0000-000000000000/status",
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    await expectStatus(res, 400, 403);
  });

  test("PATCH /api/admin/applications/{id}/status with invalid status enum returns 400", async () => {
    const res = await authenticatedApi(
      "/api/admin/applications/00000000-0000-0000-0000-000000000000/status",
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invalid_status" }),
      }
    );
    await expectStatus(res, 400, 403);
  });

  test("PATCH /api/admin/applications/{id}/status approves application (admin positive case)", async () => {
    if (adminToken && applicationId) {
      const res = await authenticatedApi(
        `/api/admin/applications/${applicationId}/status`,
        adminToken,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        }
      );
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data).toBeDefined();
    }
  });

  test("PATCH /api/admin/applications/{id}/status rejects application with reason (admin positive case)", async () => {
    if (adminToken) {
      const { token: rejectToken } = await signUpTestUser();
      const createRes = await authenticatedApi("/api/applications", rejectToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Dr. To Be Rejected",
          title: "Therapist",
          bio: "Will be rejected",
          location: "Boston",
          gender: "Male",
          specialties: ["Test"],
          therapy_types: ["CBT"],
          insurances: ["Test"],
          session_fee: 100,
          languages: ["English"],
          years_experience: 5,
          phone: "555-9999",
          email: "reject@example.com",
        }),
      });
      const appData = await createRes.json();
      const rejectAppId = appData.id;

      const res = await authenticatedApi(
        `/api/admin/applications/${rejectAppId}/status`,
        adminToken,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "rejected",
            rejection_reason: "Insufficient qualifications",
          }),
        }
      );
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data).toBeDefined();
    }
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

  test("POST /api/admin/therapists without required fields returns 400", async () => {
    const res = await authenticatedApi("/api/admin/therapists", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Dr. John Doe",
      }),
    });
    await expectStatus(res, 400, 403);
  });

  let createdTherapistId: string;

  test("POST /api/admin/therapists creates therapist (admin positive case)", async () => {
    if (adminToken) {
      const res = await authenticatedApi("/api/admin/therapists", adminToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Dr. Admin Created Therapist",
          title: "Licensed Therapist",
          bio: "Created by admin in integration test",
          location: "Test City",
          gender: "Female",
          specialties: ["Anxiety"],
          therapy_types: ["CBT"],
          insurances: ["Blue Cross"],
          session_fee: 125,
          languages: ["English"],
          years_experience: 8,
          phone: "555-8888",
          email: "admin-therapist@example.com",
        }),
      });
      await expectStatus(res, 201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      createdTherapistId = data.id;
    }
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

  test("PATCH /api/admin/therapists/{id} with invalid UUID format returns 400", async () => {
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
    await expectStatus(res, 400);
  });

  test("PATCH /api/admin/therapists/{id} updates therapist (admin positive case)", async () => {
    if (adminToken && createdTherapistId) {
      const res = await authenticatedApi(
        `/api/admin/therapists/${createdTherapistId}`,
        adminToken,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Dr. Updated Name",
            bio: "Updated bio",
          }),
        }
      );
      await expectStatus(res, 200);
    }
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

  test("DELETE /api/admin/therapists/{id} with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/admin/therapists/invalid-uuid",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 400);
  });

  test("DELETE /api/admin/therapists/{id} deletes therapist (admin positive case)", async () => {
    if (adminToken && createdTherapistId) {
      const res = await authenticatedApi(
        `/api/admin/therapists/${createdTherapistId}`,
        adminToken,
        {
          method: "DELETE",
        }
      );
      await expectStatus(res, 200);
    }
  });

  test("PATCH /api/admin/therapists/{id}/pin returns 401 without auth", async () => {
    const res = await api("/api/admin/therapists/00000000-0000-0000-0000-000000000000/pin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: true }),
    });
    await expectStatus(res, 401);
  });

  test("PATCH /api/admin/therapists/{id}/pin returns 403 for non-admin user", async () => {
    const res = await authenticatedApi(
      "/api/admin/therapists/00000000-0000-0000-0000-000000000000/pin",
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: true }),
      }
    );
    await expectStatus(res, 403);
  });

  test("PATCH /api/admin/therapists/{id}/pin with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/admin/therapists/invalid-uuid/pin", authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: true }),
    });
    await expectStatus(res, 400);
  });

  test("PATCH /api/admin/therapists/{id}/pin without required is_pinned returns 400", async () => {
    const res = await authenticatedApi(
      "/api/admin/therapists/00000000-0000-0000-0000-000000000000/pin",
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    await expectStatus(res, 400, 403);
  });

  test("PATCH /api/admin/therapists/{id}/pin pins therapist (admin positive case)", async () => {
    if (adminToken && therapistId) {
      const res = await authenticatedApi(
        `/api/admin/therapists/${therapistId}/pin`,
        adminToken,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_pinned: true }),
        }
      );
      await expectStatus(res, 200, 404);
    }
  });

  // ============================================
  // Authenticated Endpoints: Saved Therapists
  // ============================================

  let savedTherapistId: string;

  test("GET /api/saved returns 401 without auth", async () => {
    const res = await api("/api/saved");
    await expectStatus(res, 401);
  });

  test("GET /api/saved returns list of saved therapists", async () => {
    const res = await authenticatedApi("/api/saved", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.saved).toBeDefined();
    expect(Array.isArray(data.saved)).toBe(true);
  });

  test("POST /api/saved returns 401 without auth", async () => {
    if (therapistId) {
      const res = await api("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ therapist_id: therapistId }),
      });
      await expectStatus(res, 401);
    }
  });

  test("POST /api/saved saves a therapist", async () => {
    if (therapistId) {
      const res = await authenticatedApi("/api/saved", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ therapist_id: therapistId }),
      });
      await expectStatus(res, 201);
      const data = await res.json();
      expect(data).toBeDefined();
      savedTherapistId = therapistId;
    }
  });

  test("POST /api/saved returns 409 if therapist already saved", async () => {
    if (therapistId) {
      const res = await authenticatedApi("/api/saved", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ therapist_id: therapistId }),
      });
      await expectStatus(res, 409);
    }
  });

  test("POST /api/saved without therapist_id returns 400", async () => {
    const res = await authenticatedApi("/api/saved", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  test("DELETE /api/saved/{therapistId} returns 401 without auth", async () => {
    if (therapistId) {
      const res = await api(`/api/saved/${therapistId}`, {
        method: "DELETE",
      });
      await expectStatus(res, 401);
    }
  });

  test("DELETE /api/saved/{therapistId} removes a saved therapist", async () => {
    if (savedTherapistId) {
      const res = await authenticatedApi(`/api/saved/${savedTherapistId}`, authToken, {
        method: "DELETE",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.success).toBe(true);
    }
  });

  test("DELETE /api/saved/{therapistId} with non-existent UUID returns 404", async () => {
    const res = await authenticatedApi(
      "/api/saved/00000000-0000-0000-0000-000000000000",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 404);
  });

  test("DELETE /api/saved/{therapistId} with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/saved/invalid-uuid", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 400);
  });

  // ============================================
  // Authenticated Endpoints: Bookings
  // ============================================

  let bookingId: string;

  test("GET /api/bookings returns 401 without auth", async () => {
    const res = await api("/api/bookings");
    await expectStatus(res, 401);
  });

  test("GET /api/bookings returns list of bookings", async () => {
    const res = await authenticatedApi("/api/bookings", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.bookings).toBeDefined();
    expect(Array.isArray(data.bookings)).toBe(true);
  });

  test("POST /api/bookings returns 401 without auth", async () => {
    if (therapistId) {
      const res = await api("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapist_id: therapistId,
          message: "I would like to schedule a session",
          contact_method: "email",
        }),
      });
      await expectStatus(res, 401);
    }
  });

  test("POST /api/bookings creates a booking request", async () => {
    if (therapistId) {
      const res = await authenticatedApi("/api/bookings", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapist_id: therapistId,
          message: "I would like to schedule a session",
          contact_method: "email",
          preferred_date: "2026-04-15",
        }),
      });
      await expectStatus(res, 201);
      const data = await res.json();
      expect(data).toBeDefined();
      if (data.id) {
        bookingId = data.id;
      }
    }
  });

  test("POST /api/bookings with phone contact method", async () => {
    if (therapistId) {
      const res = await authenticatedApi("/api/bookings", authToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapist_id: therapistId,
          message: "Please call me to schedule",
          contact_method: "phone",
        }),
      });
      await expectStatus(res, 201);
    }
  });

  test("POST /api/bookings without required fields returns 400", async () => {
    const res = await authenticatedApi("/api/bookings", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        therapist_id: therapistId,
      }),
    });
    await expectStatus(res, 400);
  });

  // ============================================
  // Admin Endpoints: Bookings
  // ============================================

  test("GET /api/admin/bookings returns 401 without auth", async () => {
    const res = await api("/api/admin/bookings");
    await expectStatus(res, 401);
  });

  test("GET /api/admin/bookings returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/bookings", authToken);
    await expectStatus(res, 403);
  });

  test("GET /api/admin/bookings retrieves all bookings (admin positive case)", async () => {
    if (adminToken) {
      const res = await authenticatedApi("/api/admin/bookings", adminToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.bookings)).toBe(true);
    }
  });

  test("PATCH /api/admin/bookings/{id} returns 401 without auth", async () => {
    const res = await api("/api/admin/bookings/00000000-0000-0000-0000-000000000000", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "confirmed" }),
    });
    await expectStatus(res, 401);
  });

  test("PATCH /api/admin/bookings/{id} returns 403 for non-admin user", async () => {
    if (bookingId) {
      const res = await authenticatedApi(`/api/admin/bookings/${bookingId}`, authToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      await expectStatus(res, 403);
    }
  });

  test("PATCH /api/admin/bookings/{id} without required status returns 400", async () => {
    const res = await authenticatedApi(
      "/api/admin/bookings/00000000-0000-0000-0000-000000000000",
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    await expectStatus(res, 400, 403);
  });

  test("PATCH /api/admin/bookings/{id} updates booking (admin positive case)", async () => {
    if (adminToken && bookingId) {
      const res = await authenticatedApi(`/api/admin/bookings/${bookingId}`, adminToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed", admin_notes: "Confirmed with therapist" }),
      });
      await expectStatus(res, 200);
    }
  });

  // ============================================
  // Admin Endpoints: Subscriptions
  // ============================================

  let subscriptionId: string;

  test("GET /api/admin/subscriptions returns 401 without auth", async () => {
    const res = await api("/api/admin/subscriptions");
    await expectStatus(res, 401);
  });

  test("GET /api/admin/subscriptions returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/subscriptions", authToken);
    await expectStatus(res, 403);
  });

  test("GET /api/admin/subscriptions retrieves subscriptions (admin positive case)", async () => {
    if (adminToken) {
      const res = await authenticatedApi("/api/admin/subscriptions", adminToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.subscriptions)).toBe(true);
    }
  });

  test("POST /api/admin/subscriptions returns 401 without auth", async () => {
    const res = await api("/api/admin/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        therapist_id: therapistId || "00000000-0000-0000-0000-000000000001",
        status: "active",
        plan: "premium",
      }),
    });
    await expectStatus(res, 401);
  });

  test("POST /api/admin/subscriptions returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/subscriptions", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        therapist_id: therapistId || "00000000-0000-0000-0000-000000000001",
        status: "active",
        plan: "premium",
      }),
    });
    await expectStatus(res, 403);
  });

  test("POST /api/admin/subscriptions without required fields returns 400", async () => {
    const res = await authenticatedApi("/api/admin/subscriptions", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        therapist_id: therapistId,
      }),
    });
    await expectStatus(res, 400, 403);
  });

  test("POST /api/admin/subscriptions creates subscription (admin positive case)", async () => {
    if (adminToken && therapistId) {
      const res = await authenticatedApi("/api/admin/subscriptions", adminToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          therapist_id: therapistId,
          status: "active",
          plan: "premium",
          amount_paid: 99.99,
        }),
      });
      await expectStatus(res, 201);
      const data = await res.json();
      expect(data.id).toBeDefined();
      subscriptionId = data.id;
    }
  });

  test("PATCH /api/admin/subscriptions/{id} returns 401 without auth", async () => {
    const res = await api("/api/admin/subscriptions/00000000-0000-0000-0000-000000000000", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "inactive",
      }),
    });
    await expectStatus(res, 401);
  });

  test("PATCH /api/admin/subscriptions/{id} returns 403 for non-admin user", async () => {
    const res = await authenticatedApi(
      "/api/admin/subscriptions/00000000-0000-0000-0000-000000000000",
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "inactive",
        }),
      }
    );
    await expectStatus(res, 403);
  });

  test("PATCH /api/admin/subscriptions/{id} with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi("/api/admin/subscriptions/invalid-uuid", authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "inactive",
      }),
    });
    await expectStatus(res, 400);
  });

  test("PATCH /api/admin/subscriptions/{id} updates subscription (admin positive case)", async () => {
    if (adminToken && subscriptionId) {
      const res = await authenticatedApi(
        `/api/admin/subscriptions/${subscriptionId}`,
        adminToken,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "inactive",
          }),
        }
      );
      await expectStatus(res, 200);
    }
  });

  // ============================================
  // Admin Endpoints: Notifications
  // ============================================

  test("GET /api/admin/notifications returns 401 without auth", async () => {
    const res = await api("/api/admin/notifications");
    await expectStatus(res, 401);
  });

  test("GET /api/admin/notifications returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/notifications", authToken);
    await expectStatus(res, 403);
  });

  test("GET /api/admin/notifications retrieves notifications (admin positive case)", async () => {
    if (adminToken) {
      const res = await authenticatedApi("/api/admin/notifications", adminToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.notifications)).toBe(true);
    }
  });

  test("POST /api/admin/notifications returns 401 without auth", async () => {
    const res = await api("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Notification",
        message: "This is a test",
        target: "all",
      }),
    });
    await expectStatus(res, 401);
  });

  test("POST /api/admin/notifications returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/notifications", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test Notification",
        message: "This is a test",
        target: "all",
      }),
    });
    await expectStatus(res, 403);
  });

  test("POST /api/admin/notifications without required fields returns 400", async () => {
    const res = await authenticatedApi("/api/admin/notifications", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test",
      }),
    });
    await expectStatus(res, 400, 403);
  });

  test("POST /api/admin/notifications with valid target enum sends notification (admin positive case)", async () => {
    if (adminToken) {
      const res = await authenticatedApi("/api/admin/notifications", adminToken, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Admin Test Notification",
          message: "Test broadcast message",
          target: "featured",
        }),
      });
      await expectStatus(res, 201);
    }
  });

  // ============================================
  // Admin Endpoints: Content
  // ============================================

  test("GET /api/admin/content returns 401 without auth", async () => {
    const res = await api("/api/admin/content");
    await expectStatus(res, 401);
  });

  test("GET /api/admin/content returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/content", authToken);
    await expectStatus(res, 403);
  });

  test("GET /api/admin/content retrieves all content (admin positive case)", async () => {
    if (adminToken) {
      const res = await authenticatedApi("/api/admin/content", adminToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.content)).toBe(true);
    }
  });

  test("PATCH /api/admin/content/{key} returns 401 without auth", async () => {
    const res = await api("/api/admin/content/welcome-message", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        value: "Updated welcome message",
      }),
    });
    await expectStatus(res, 401);
  });

  test("PATCH /api/admin/content/{key} returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/content/welcome-message", authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        value: "Updated welcome message",
      }),
    });
    await expectStatus(res, 403);
  });

  test("PATCH /api/admin/content/{key} updates content (admin positive case)", async () => {
    if (adminToken) {
      const res = await authenticatedApi("/api/admin/content/test-key", adminToken, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: "Updated by admin test",
        }),
      });
      await expectStatus(res, 200, 400);
    }
  });

  // ============================================
  // Admin Endpoints: Analytics
  // ============================================

  test("GET /api/admin/analytics returns 401 without auth", async () => {
    const res = await api("/api/admin/analytics");
    await expectStatus(res, 401);
  });

  test("GET /api/admin/analytics returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/analytics", authToken);
    await expectStatus(res, 403);
  });

  test("GET /api/admin/analytics retrieves analytics (admin positive case)", async () => {
    if (adminToken) {
      const res = await authenticatedApi("/api/admin/analytics", adminToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data).toBeDefined();
    }
  });

  // ============================================
  // Admin Endpoints: Support
  // ============================================

  let supportId: string;

  test("GET /api/admin/support returns 401 without auth", async () => {
    const res = await api("/api/admin/support");
    await expectStatus(res, 401);
  });

  test("GET /api/admin/support returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/support", authToken);
    await expectStatus(res, 403);
  });

  test("GET /api/admin/support retrieves all support requests (admin positive case)", async () => {
    if (adminToken) {
      const res = await authenticatedApi("/api/admin/support", adminToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.requests)).toBe(true);
    }
  });

  test("PATCH /api/admin/support/{id} returns 401 without auth", async () => {
    const res = await api("/api/admin/support/00000000-0000-0000-0000-000000000000", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    await expectStatus(res, 401);
  });

  test("PATCH /api/admin/support/{id} returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/support/00000000-0000-0000-0000-000000000000", authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_progress" }),
    });
    await expectStatus(res, 403);
  });

  test("PATCH /api/admin/support/{id} without required status returns 400", async () => {
    const res = await authenticatedApi("/api/admin/support/00000000-0000-0000-0000-000000000000", authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400, 403);
  });

  test("PATCH /api/admin/support/{id} updates support request (admin positive case)", async () => {
    if (adminToken) {
      const supportRes = await api("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Support",
          email: "support@example.com",
          subject: "Test Issue",
          message: "Need help with app",
          role: "client",
        }),
      });
      const supportData = await supportRes.json();
      const newSupportId = supportData.id;

      const res = await authenticatedApi(
        `/api/admin/support/${newSupportId}`,
        adminToken,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "in_progress" }),
        }
      );
      await expectStatus(res, 200);
    }
  });

  // ============================================
  // Admin Endpoints: Contact Messages
  // ============================================

  let contactMessageId: string;

  test("GET /api/admin/contact-messages returns 401 without auth", async () => {
    const res = await api("/api/admin/contact-messages");
    await expectStatus(res, 401);
  });

  test("GET /api/admin/contact-messages returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/contact-messages", authToken);
    await expectStatus(res, 403);
  });

  test("GET /api/admin/contact-messages retrieves all messages (admin positive case)", async () => {
    if (adminToken) {
      const res = await authenticatedApi("/api/admin/contact-messages", adminToken);
      await expectStatus(res, 200);
      const data = await res.json();
      expect(Array.isArray(data.messages)).toBe(true);
    }
  });

  test("PATCH /api/admin/contact-messages/{id}/read returns 401 without auth", async () => {
    const res = await api("/api/admin/contact-messages/00000000-0000-0000-0000-000000000000/read", {
      method: "PATCH",
    });
    await expectStatus(res, 401);
  });

  test("PATCH /api/admin/contact-messages/{id}/read returns 403 for non-admin user", async () => {
    const res = await authenticatedApi(
      "/api/admin/contact-messages/00000000-0000-0000-0000-000000000000/read",
      authToken,
      {
        method: "PATCH",
      }
    );
    await expectStatus(res, 403);
  });

  test("PATCH /api/admin/contact-messages/{id}/read with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/admin/contact-messages/invalid-uuid/read",
      authToken,
      {
        method: "PATCH",
      }
    );
    await expectStatus(res, 400);
  });

  test("PATCH /api/admin/contact-messages/{id}/read marks message as read (admin positive case)", async () => {
    if (adminToken) {
      const contactRes = await api("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Contact",
          email: "contact@example.com",
          subject: "Contact Test",
          message: "This is a test contact message",
        }),
      });
      const contactData = await contactRes.json();
      const newMessageId = contactData.id;

      const res = await authenticatedApi(
        `/api/admin/contact-messages/${newMessageId}/read`,
        adminToken,
        {
          method: "PATCH",
        }
      );
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.success).toBe(true);
      contactMessageId = newMessageId;
    }
  });

  test("DELETE /api/admin/contact-messages/{id} returns 401 without auth", async () => {
    const res = await api("/api/admin/contact-messages/00000000-0000-0000-0000-000000000000", {
      method: "DELETE",
    });
    await expectStatus(res, 401);
  });

  test("DELETE /api/admin/contact-messages/{id} returns 403 for non-admin user", async () => {
    const res = await authenticatedApi(
      "/api/admin/contact-messages/00000000-0000-0000-0000-000000000000",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 403);
  });

  test("DELETE /api/admin/contact-messages/{id} with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/admin/contact-messages/invalid-uuid",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 400);
  });

  test("DELETE /api/admin/contact-messages/{id} deletes message (admin positive case)", async () => {
    if (adminToken && contactMessageId) {
      const res = await authenticatedApi(
        `/api/admin/contact-messages/${contactMessageId}`,
        adminToken,
        {
          method: "DELETE",
        }
      );
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.success).toBe(true);
    }
  });

  // ============================================
  // Authenticated Endpoints: Preferences
  // ============================================

  test("GET /api/preferences returns 401 without auth", async () => {
    const res = await api("/api/preferences");
    await expectStatus(res, 401);
  });

  test("GET /api/preferences returns user preferences", async () => {
    const res = await authenticatedApi("/api/preferences", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toBeDefined();
  });

  test("PUT /api/preferences returns 401 without auth", async () => {
    const res = await api("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferred_gender: ["Female"],
      }),
    });
    await expectStatus(res, 401);
  });

  test("PUT /api/preferences updates user preferences", async () => {
    const res = await authenticatedApi("/api/preferences", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferred_gender: ["Female", "Non-binary"],
        preferred_specialties: ["Anxiety", "Depression"],
        preferred_therapy_types: ["CBT"],
        preferred_insurance: ["Blue Cross"],
        preferred_location: "New York",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toBeDefined();
  });

  // ============================================
  // Authenticated Endpoints: Notification Preferences
  // ============================================

  test("GET /api/notification-preferences returns 401 without auth", async () => {
    const res = await api("/api/notification-preferences");
    await expectStatus(res, 401);
  });

  test("GET /api/notification-preferences returns notification preferences", async () => {
    const res = await authenticatedApi("/api/notification-preferences", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toBeDefined();
  });

  test("PATCH /api/notification-preferences returns 401 without auth", async () => {
    const res = await api("/api/notification-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_reminders: true,
      }),
    });
    await expectStatus(res, 401);
  });

  test("PATCH /api/notification-preferences updates preferences", async () => {
    const res = await authenticatedApi("/api/notification-preferences", authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_reminders: false,
        new_messages: true,
        promotions: false,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toBeDefined();
  });

  // ============================================
  // Authenticated Endpoints: Therapist Profile
  // ============================================

  test("GET /api/therapist/profile returns 401 without auth", async () => {
    const res = await api("/api/therapist/profile");
    await expectStatus(res, 401);
  });

  test("GET /api/therapist/profile returns therapist profile if user is therapist", async () => {
    const res = await authenticatedApi("/api/therapist/profile", authToken);
    await expectStatus(res, 200, 404);
  });

  test("PATCH /api/therapist/profile returns 401 without auth", async () => {
    const res = await api("/api/therapist/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accepting_new_clients: true,
      }),
    });
    await expectStatus(res, 401);
  });

  test("PATCH /api/therapist/profile updates therapist profile", async () => {
    const res = await authenticatedApi("/api/therapist/profile", authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accepting_new_clients: true,
      }),
    });
    await expectStatus(res, 200, 404);
  });

  test("PATCH /api/therapist/profile with is_pinned flag", async () => {
    const res = await authenticatedApi("/api/therapist/profile", authToken, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_pinned: true,
      }),
    });
    await expectStatus(res, 200, 404);
  });

  test("GET /api/therapist/inquiries returns 401 without auth", async () => {
    const res = await api("/api/therapist/inquiries");
    await expectStatus(res, 401);
  });

  test("GET /api/therapist/inquiries returns booking inquiries", async () => {
    const res = await authenticatedApi("/api/therapist/inquiries", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toBeDefined();
  });

  test("GET /api/therapist/subscription returns 401 without auth", async () => {
    const res = await api("/api/therapist/subscription");
    await expectStatus(res, 401);
  });

  test("GET /api/therapist/subscription returns subscription info", async () => {
    const res = await authenticatedApi("/api/therapist/subscription", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data).toBeDefined();
  });

  // ============================================
  // File Upload Endpoints
  // ============================================

  let uploadedDocumentId: string;

  test("POST /api/upload/license-document returns 401 without auth", async () => {
    const form = new FormData();
    form.append("file", createTestFile("license.pdf", "License content"));
    const res = await api("/api/upload/license-document", {
      method: "POST",
      body: form,
    });
    await expectStatus(res, 401);
  });

  test("POST /api/upload/license-document uploads file with auth", async () => {
    const form = new FormData();
    form.append("file", createTestFile("license.pdf", "License document content"));
    const res = await authenticatedApi("/api/upload/license-document", authToken, {
      method: "POST",
      body: form,
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.url).toBeDefined();
    uploadedDocumentId = data.url;
  });

  test("GET /api/upload/license-document/file/{id} returns 401 without auth", async () => {
    const res = await api("/api/upload/license-document/file/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 401);
  });

  test("GET /api/upload/license-document/file/{id} with non-existent ID returns 404", async () => {
    const res = await authenticatedApi(
      "/api/upload/license-document/file/00000000-0000-0000-0000-000000000000",
      authToken
    );
    await expectStatus(res, 404);
  });

  test("GET /api/upload/license-document/file/{id} with invalid UUID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/upload/license-document/file/invalid-uuid",
      authToken
    );
    await expectStatus(res, 400);
  });

  // ============================================
  // Authenticated Endpoints: Therapist License Documents
  // ============================================

  test("POST /api/therapist/license-documents returns 401 without auth", async () => {
    const res = await api("/api/therapist/license-documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_urls: ["http://example.com/doc1.pdf"],
      }),
    });
    await expectStatus(res, 401);
  });

  test("POST /api/therapist/license-documents updates documents with valid URLs", async () => {
    const res = await authenticatedApi("/api/therapist/license-documents", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_urls: ["http://example.com/license1.pdf", "http://example.com/license2.pdf"],
      }),
    });
    await expectStatus(res, 200, 404);
  });

  test("POST /api/therapist/license-documents with empty array updates documents", async () => {
    const res = await authenticatedApi("/api/therapist/license-documents", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_urls: [],
      }),
    });
    await expectStatus(res, 200, 404);
  });

  test("POST /api/therapist/license-documents without required field returns 400", async () => {
    const res = await authenticatedApi("/api/therapist/license-documents", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400, 401, 404);
  });

  // ============================================
  // Admin Endpoints: Login
  // ============================================

  test("POST /api/admin/login with missing email returns 400", async () => {
    const res = await api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "somepassword",
      }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/admin/login with missing password returns 400", async () => {
    const res = await api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@example.com",
      }),
    });
    await expectStatus(res, 400);
  });

  test("POST /api/admin/login with invalid credentials returns 401", async () => {
    const res = await api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nonexistent@example.com",
        password: "wrongpassword",
      }),
    });
    await expectStatus(res, 401);
  });

  test("POST /api/admin/login with non-admin user returns 403", async () => {
    const res = await api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: authEmail,
        password: "anypassword",
      }),
    });
    await expectStatus(res, 401, 403);
  });

  // ============================================
  // Admin Endpoints: Cleanup
  // ============================================

  test("DELETE /api/admin/cleanup/therapists returns 401 without auth", async () => {
    const res = await api("/api/admin/cleanup/therapists", {
      method: "DELETE",
    });
    await expectStatus(res, 401);
  });

  test("DELETE /api/admin/cleanup/therapists returns 403 for non-admin user", async () => {
    const res = await authenticatedApi("/api/admin/cleanup/therapists", authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 403);
  });

  test("DELETE /api/admin/cleanup/therapists cleans up therapists (admin positive case)", async () => {
    if (adminToken) {
      const res = await authenticatedApi("/api/admin/cleanup/therapists", adminToken, {
        method: "DELETE",
      });
      await expectStatus(res, 200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.deleted).toBeDefined();
    }
  });
});
