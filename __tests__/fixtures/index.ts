/**
 * Test Fixtures Index
 *
 * Centralized exports for all test fixtures and utilities.
 * Import from this file for the cleanest test setup.
 *
 * Usage:
 *   import { createSupabaseMock, createTestUser, createMockRequest } from '@/__tests__/fixtures';
 */

// Supabase mocking utilities
export {
    createSupabaseMock,
    createSupabaseServerMock,
    createAuthenticatedMock,
    createUnauthenticatedMock,
    createDynamicSupabaseMock,
    type MockUser,
    type TableMockConfig,
    type SupabaseMockConfig,
} from "./supabase-mock";

// Database fixtures
export {
    // User fixtures
    createTestUser,
    type TestUser,
    // Funnel fixtures
    createTestFunnelProject,
    type TestFunnelProject,
    // Offer fixtures
    createTestOffer,
    type TestOffer,
    // Transcript fixtures
    createTestTranscript,
    type TestTranscript,
    // Page fixtures
    createTestEnrollmentPage,
    createTestWatchPage,
    createTestRegistrationPage,
    type TestPage,
    // Marketing fixtures
    createTestMarketingProfile,
    createTestContentBrief,
    createTestPostVariant,
    createTestMarketingAnalytics,
    type TestMarketingProfile,
    type TestContentBrief,
    type TestPostVariant,
    type TestMarketingAnalytics,
    // Followup fixtures
    createTestProspect,
    createTestSequence,
    createTestMessage,
    type TestProspect,
    type TestSequence,
    type TestMessage,
    // Utilities
    generateId,
    generateUUID,
    resetIdCounter,
} from "./db-fixtures";
