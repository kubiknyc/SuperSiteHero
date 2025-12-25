# Test Suite Generator

Create comprehensive test suite for the JobSight application.

## Instructions

You are creating a comprehensive test suite. Follow these steps:

1. **Ask which phase** the user wants to tackle:
   - Phase 1: Critical Business Logic (RFIs, Submittals, Offline Sync, Search)
   - Phase 2: Untested API Services (55+ services)
   - Phase 3: Visualization & Advanced Features (BIM/AR/VR)
   - Phase 4: UI Components & Layout
   - Phase 5: Integration & E2E Tests
   - Phase 6: Security & Performance Tests

2. **Based on their choice**, create the tests using the patterns from `.claude/agents/testing-specialist.md`

3. **For each feature**, create:
   - Unit tests for hooks using Vitest + React Testing Library
   - Component tests for UI components
   - Integration tests for workflows
   - E2E tests for critical user journeys (Playwright)

4. **Use the existing test infrastructure**:
   - Factories in `src/__tests__/factories/`
   - Helpers in `src/__tests__/helpers/`
   - Test setup in `src/__tests__/setup.tsx`

5. **Follow the test templates** in the testing-specialist agent

6. **Run the tests** after creation to verify they pass

7. **Generate a coverage report** and show the user the improvement
