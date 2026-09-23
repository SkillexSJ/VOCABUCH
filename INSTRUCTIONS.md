# AI Agent Operating Instructions

## Vocabulary Learning Platform

> **Purpose:** This document defines the mandatory operating rules for
> an AI coding agent working on this repository.
>
> The goal is to make the agent **accurate, predictable,
> evidence-driven, modular, and resistant to hallucination or accidental
> architectural drift**.

------------------------------------------------------------------------

# 1. Core Mission

You are the engineering agent for this project.

Your job is to:

1.  Understand the existing repository before changing it.
2.  Execute the user's requested work accurately.
3.  Never invent files, directories, APIs, commands, dependencies, or
    existing functionality.
4.  Preserve the project's architecture and conventions unless the user
    explicitly asks to change them.
5.  Make the smallest safe change that completely solves the requested
    problem.
6.  Verify your work before claiming it is complete.
7.  Clearly report uncertainty, assumptions, failures, and verification
    results.
8.  Keep the codebase modular so future features can be added without
    unnecessary rewrites.

**Accuracy is more important than speed.**

------------------------------------------------------------------------

# 2. Non-Negotiable Rules

## Rule 1 --- Inspect Before Acting

Never assume the repository structure.

Before modifying code:

-   Inspect the current working directory.
-   Inspect the relevant files.
-   Read the relevant configuration files.
-   Identify the package manager.
-   Identify the existing application structure.
-   Identify the existing implementation of the feature.
-   Search for existing functions/components/modules before creating new
    ones.

Do not say:

> "The project probably has..."

Instead, inspect it.

------------------------------------------------------------------------

## Rule 2 --- Never Hallucinate

Never invent:

-   File paths
-   Function names
-   Class names
-   API endpoints
-   Database tables
-   Environment variables
-   npm packages
-   Configuration options
-   Existing behavior
-   Test results
-   Build results
-   Git history
-   External API behavior

If you do not know something, verify it.

If it cannot be verified, explicitly state:

> "I could not verify this."

Never present an assumption as a fact.

------------------------------------------------------------------------

## Rule 3 --- Verify Paths Before Editing

Before editing a file:

1.  Confirm the file exists.
2.  Confirm its actual path.
3.  Read enough surrounding code to understand its role.
4.  Check whether another file is the correct location for the change.

Before creating a file:

1.  Confirm the intended parent directory exists or should legitimately
    be created.
2.  Check whether a similar file already exists.
3.  Follow the repository's existing naming conventions.

Never create duplicate files because you failed to search first.

------------------------------------------------------------------------

## Rule 4 --- Do Not Rewrite Unnecessarily

Do not rewrite an entire file when a focused modification is sufficient.

Prefer:

-   Small changes
-   Reusable functions
-   Existing abstractions
-   Existing utilities
-   Existing components
-   Existing validation
-   Existing services

Avoid unnecessary refactoring during unrelated work.

If a refactor is genuinely required, explain why before performing a
large change.

------------------------------------------------------------------------

## Rule 5 --- Preserve Existing Behavior

Unless the user explicitly requests a behavior change:

-   Do not remove existing functionality.
-   Do not change public APIs unnecessarily.
-   Do not change database semantics unnecessarily.
-   Do not change authentication behavior unnecessarily.
-   Do not change UI behavior unrelated to the task.
-   Do not change dependencies without a reason.

Every change should have a clear reason.

------------------------------------------------------------------------

# 3. Required Workflow

Every non-trivial task must follow this workflow.

``` text
USER REQUEST
    ↓
UNDERSTAND
    ↓
INSPECT REPOSITORY
    ↓
IDENTIFY AFFECTED AREAS
    ↓
FORM PLAN
    ↓
IMPLEMENT
    ↓
VERIFY
    ↓
REVIEW
    ↓
REPORT
```

------------------------------------------------------------------------

# 4. Step 1 --- Understand the Request

First determine:

-   What exactly is the user asking for?
-   What is the expected result?
-   Which application is affected?
-   Which files/modules are likely involved?
-   Is this a feature, bug fix, refactor, configuration change,
    documentation task, or investigation?
-   Are there explicit constraints?
-   Are there implicit constraints from the architecture?

If the request is sufficiently clear, proceed without unnecessary
questions.

If a missing detail could cause destructive or fundamentally different
implementation choices, ask before proceeding.

------------------------------------------------------------------------

# 5. Step 2 --- Inspect the Repository

Before implementation, inspect relevant repository information.

At minimum, determine:

``` text
Current directory
Project structure
Package manager
Root package.json
Workspace configuration
Application directories
Relevant source files
Relevant tests
Environment/configuration files
Documentation
Git status
```

Typical commands:

``` bash
pwd
ls
find . -maxdepth 2 -type f
git status --short
```

Use the appropriate equivalent for the operating system.

For JavaScript/TypeScript projects, inspect:

``` text
package.json
pnpm-workspace.yaml
turbo.json
tsconfig.json
eslint configuration
prettier configuration
application package.json files
```

Do not blindly run commands that may be destructive.

------------------------------------------------------------------------

# 6. Step 3 --- Search Before Creating

Before implementing something new, search the repository.

Examples:

``` bash
rg "functionName" .
rg "ComponentName" .
rg "endpoint-name" .
rg "tableName" .
rg "featureName" .
```

Look for:

-   Existing implementations
-   Similar components
-   Existing services
-   Existing DTOs
-   Existing schemas
-   Existing database models
-   Existing API routes
-   Existing tests
-   Existing utility functions

Reuse existing architecture when appropriate.

------------------------------------------------------------------------

# 7. Step 4 --- Build a Small Plan

For non-trivial tasks, create a concise implementation plan.

Example:

``` text
Plan:
1. Update the vocabulary domain DTO.
2. Add validation.
3. Update the service method.
4. Add the API endpoint.
5. Add unit tests.
6. Run typecheck and tests.
7. Review the diff.
```

Do not create a huge plan for a trivial change.

Do not begin coding blindly on a large task.

------------------------------------------------------------------------

# 8. Step 5 --- Implement

Implement only what is necessary.

Follow the existing repository conventions for:

-   Naming
-   Folder structure
-   Imports
-   Formatting
-   Error handling
-   Validation
-   Logging
-   Testing
-   API design
-   Database access
-   React component structure
-   NestJS module structure

Do not introduce a new pattern when the repository already has an
established pattern.

------------------------------------------------------------------------

# 9. Step 6 --- Verify

**Never claim a task is complete merely because the code was written.**

Verification should be proportional to the change.

For code changes, use applicable checks such as:

``` bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Only run commands that actually exist in the repository.

First inspect `package.json` and workspace scripts if necessary.

For database changes:

-   Verify schema consistency.
-   Run the appropriate migration/check.
-   Confirm affected queries still work.
-   Never silently destroy existing data.

For API changes:

-   Verify request validation.
-   Verify response shape.
-   Verify authentication/authorization.
-   Run relevant tests.

For frontend changes:

-   Run type checking.
-   Run tests if available.
-   Build the application when practical.
-   Check the affected component/page behavior.

For extension changes:

-   Verify the relevant manifest/build.
-   Verify content-script/background/popup communication.
-   Build the target browser package when practical.
-   Check Chrome/Firefox-specific behavior when relevant.

------------------------------------------------------------------------

# 10. Never Fake Verification

Never say:

> "Tests passed"

unless you actually ran the tests and they passed.

Never say:

> "Build successful"

unless you actually ran the build and it succeeded.

Never say:

> "The API works"

unless you actually verified it.

Use precise reporting:

``` text
Verification:
- Typecheck: passed
- Unit tests: passed
- Build: not run
- Browser manual test: not performed
```

------------------------------------------------------------------------

# 11. Handle Failures Correctly

If a command fails:

1.  Read the actual error.
2.  Determine whether the failure is caused by your change.
3.  Fix it if it is within the task scope.
4.  Re-run the relevant verification.
5.  If it is unrelated, report it clearly.

Never hide errors.

Never replace a failed verification with an assumption.

Example:

``` text
The implementation is complete, but verification is blocked because
the repository's existing dependency installation is broken:
<actual error>

I did not claim the build passed.
```

------------------------------------------------------------------------

# 12. Project Architecture

The project is a modular vocabulary-learning platform.

The intended high-level architecture is:

``` text
                 ┌──────────────────────┐
                 │ Chrome / Firefox     │
                 │ Browser Extension    │
                 └──────────┬───────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │  NestJS API │
                     └──────┬──────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
         ┌──────────────┐        ┌─────────────┐
         │ PostgreSQL   │        │ Redis       │
         │ Source Truth │        │ Later/Cache │
         └──────────────┘        └─────────────┘

                 ┌──────────────────────┐
                 │ Next.js Web Dashboard │
                 └──────────┬───────────┘
                            │
                            ▼
                       NestJS API
```

The architecture is:

> **Modular monolith first, microservice-ready later.**

Do NOT introduce microservices unless there is a concrete technical
reason.

Do NOT introduce Kubernetes unless there is a concrete operational
requirement.

Do NOT add infrastructure merely because it sounds scalable.

------------------------------------------------------------------------

# 13. Expected Monorepo Structure

The intended structure is approximately:

``` text
project-root/
├── apps/
│   ├── extension/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── database/
│   ├── types/
│   ├── validation/
│   ├── config/
│   └── ui/
│
├── infrastructure/
├── docs/
│
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

**Important:**

This is the architectural target, not proof that every directory
currently exists.

Always inspect the actual repository before assuming this structure is
already implemented.

------------------------------------------------------------------------

# 14. Technology Direction

Unless the user explicitly changes the architecture, prefer:

### Browser Extension

``` text
WXT
TypeScript
React
WebExtensions APIs
```

The extension should support:

-   Chrome
-   Firefox
-   Chromium-based browsers where practical

Avoid separate codebases for each browser unless technically necessary.

------------------------------------------------------------------------

### Web Application

``` text
Next.js
React
TypeScript
Tailwind CSS
```

------------------------------------------------------------------------

### Backend

``` text
NestJS
TypeScript
```

Use NestJS modules to separate domains.

------------------------------------------------------------------------

### Database

``` text
PostgreSQL
```

Use an ORM/query layer already selected by the repository.

If the repository has not yet chosen one, prefer a lightweight, strongly
typed solution such as:

``` text
Drizzle ORM
```

Do not switch ORM libraries during an unrelated task.

------------------------------------------------------------------------

### Validation

Prefer:

``` text
Zod
```

for shared validation where appropriate.

NestJS request boundaries may also use DTO/class-validator patterns if
that is what the existing backend already uses.

**Consistency with the existing codebase takes priority.**

------------------------------------------------------------------------

# 15. Backend Module Boundaries

The backend should remain domain-oriented.

Possible modules:

``` text
auth
users
vocabulary
dictionary
translation
reviews
statistics
notifications
settings
collections
tags
imports
ai
```

Do not create every possible module immediately.

Create modules when the corresponding functionality actually exists.

------------------------------------------------------------------------

# 16. Important Domain Separation

Keep shared dictionary information separate from user-specific learning
information.

Conceptually:

``` text
dictionary_entries
        │
        ├── definitions
        ├── translations
        └── pronunciation

user_vocabulary
        │
        ├── user
        ├── dictionary_entry
        ├── learning_status
        ├── source_url
        ├── source_sentence
        └── timestamps

reviews
        │
        ├── user_vocabulary
        ├── result
        └── reviewed_at
```

Do not duplicate dictionary data for every user unless there is a
demonstrated reason.

------------------------------------------------------------------------

# 17. Extension Responsibilities

The extension should remain relatively thin.

Typical responsibilities:

``` text
Content Script
    ↓
Detect selected text / page context

Background Service
    ↓
Authentication
API communication
Context menu
Synchronization

Popup
    ↓
Quick lookup
Save word
Recent vocabulary

Side Panel
    ↓
Expanded vocabulary experience

Options
    ↓
User settings
```

Business logic that belongs on the backend should not unnecessarily be
duplicated in the extension.

------------------------------------------------------------------------

# 18. API Design Rules

Use versioned APIs where appropriate:

``` text
/v1/...
```

Examples:

``` text
POST   /v1/vocabulary
GET    /v1/vocabulary
GET    /v1/vocabulary/:id
PATCH  /v1/vocabulary/:id
DELETE /v1/vocabulary/:id

POST   /v1/lookup
POST   /v1/reviews
GET    /v1/stats
```

These are examples of the intended direction, **not proof that these
endpoints already exist**.

Always inspect the actual API before modifying or referencing an
endpoint.

------------------------------------------------------------------------

# 19. External Provider Rule

External dictionary, translation, and AI providers must be isolated
behind adapters/interfaces when practical.

Conceptually:

``` text
Vocabulary Service
       │
       ▼
Dictionary Provider Interface
       │
       ├── Provider A
       ├── Provider B
       └── Future Provider
```

Do not scatter provider-specific API calls throughout business logic.

This allows providers to be replaced later.

------------------------------------------------------------------------

# 20. Secrets and Security

Never place secrets in the browser extension.

Never commit:

``` text
API keys
database passwords
JWT secrets
OAuth client secrets
private keys
service credentials
```

Use environment variables or the project's secret-management mechanism.

Never expose server-only secrets through:

``` text
NEXT_PUBLIC_*
browser bundles
extension source
client-side JavaScript
```

Follow least privilege.

Validate user input at system boundaries.

Enforce authorization on protected resources.

Do not rely solely on frontend checks for security.

------------------------------------------------------------------------

# 21. Database Safety

Database changes require extra caution.

Before modifying the schema:

1.  Inspect the current schema.
2.  Identify existing relations.
3.  Check migration conventions.
4.  Determine whether the change is backward compatible.
5.  Avoid destructive migrations unless explicitly required.
6.  Never drop user data casually.

For destructive operations, stop and require explicit confirmation
unless the user clearly requested the destructive operation.

------------------------------------------------------------------------

# 22. Dependency Rules

Before installing a dependency:

1.  Check whether the functionality already exists in the repository.
2.  Check whether an existing dependency can solve it.
3.  Determine whether the dependency is actually necessary.
4.  Prefer mature, maintained libraries.
5.  Avoid dependency bloat.

Never install packages merely because they are popular.

Never silently replace major dependencies.

After adding a dependency:

-   Update the correct package manifest.
-   Update the lockfile using the project's package manager.
-   Verify the build/typecheck if practical.

------------------------------------------------------------------------

# 23. Package Manager Rule

Determine the package manager from the repository.

If the repository uses:

``` text
pnpm
```

use pnpm.

If it uses another package manager, follow the existing repository
convention unless there is a clear reason to change it.

Do not mix:

``` text
npm
yarn
pnpm
bun
```

without a deliberate reason.

------------------------------------------------------------------------

# 24. Environment Variables

Before using an environment variable:

1.  Search for it.
2.  Check `.env.example` or equivalent.
3.  Check configuration modules.
4.  Determine whether it is server-only or client-safe.

If adding a new variable:

-   Add it to the appropriate example configuration.
-   Document what it does.
-   Never commit the actual secret.

------------------------------------------------------------------------

# 25. Git Rules

Before substantial changes:

``` bash
git status --short
```

Understand whether there are existing user changes.

**Never overwrite or discard user changes without explicit permission.**

Never run destructive commands such as:

``` bash
git reset --hard
git clean -fd
rm -rf
```

unless the user explicitly requests the destructive operation and the
consequences are clear.

After implementation:

``` bash
git diff
git status --short
```

Review the diff.

Look for:

-   Accidental files
-   Debug logs
-   Secrets
-   Unrelated changes
-   Large generated files
-   Temporary files
-   Formatting noise
-   Incorrect imports

------------------------------------------------------------------------

# 26. Do Not Touch Unrelated Work

If `git status` shows pre-existing modifications:

-   Do not overwrite them.
-   Do not revert them.
-   Do not assume they were created by you.
-   Keep your changes isolated.

If your change conflicts with an existing modification, inspect
carefully and resolve without destroying the user's work.

------------------------------------------------------------------------

# 27. Testing Strategy

Prefer tests at the appropriate level.

### Unit tests

Use for:

-   Business logic
-   Utility functions
-   Validation
-   Services
-   Domain behavior

### Integration tests

Use for:

-   Database interactions
-   API behavior
-   Module integration

### End-to-end tests

Use for:

-   Important user workflows
-   Authentication
-   Vocabulary saving
-   Lookup
-   Review flows

Do not write tests purely to increase test count.

Tests should protect meaningful behavior.

------------------------------------------------------------------------

# 28. Frontend Rules

For React/Next.js:

-   Keep components focused.
-   Avoid giant components.
-   Separate UI from business logic when appropriate.
-   Reuse shared components.
-   Reuse existing design tokens.
-   Avoid duplicated API logic.
-   Handle loading, error, empty, and success states.
-   Maintain accessibility.
-   Do not introduce unnecessary state management.

Do not add a global state library unless the application actually needs
it.

------------------------------------------------------------------------

# 29. Extension-Specific Rules

Remember that extension environments differ from normal websites.

Consider:

-   Content script isolation
-   Background service lifecycle
-   Permissions
-   Manifest differences
-   Browser compatibility
-   Extension storage
-   Cross-origin requests
-   CSP
-   Authentication token handling

Do not assume browser APIs behave identically everywhere.

When browser-specific behavior matters, verify it.

------------------------------------------------------------------------

# 30. Performance Rules

Optimize based on evidence, not speculation.

Do not prematurely add:

``` text
Redis
queues
CDNs
microservices
Kubernetes
complex caching
event buses
```

unless the requirement justifies them.

For example:

``` text
MVP
↓
Measure
↓
Identify bottleneck
↓
Optimize
```

not:

``` text
MVP
↓
Add every scalable technology
```

------------------------------------------------------------------------

# 31. CDN Rule

A CDN is not a mandatory application component.

Do not implement a custom CDN layer.

If the hosting platform already provides CDN/edge delivery, use that
capability naturally.

The backend API remains responsible for dynamic operations such as:

``` text
authentication
saving vocabulary
lookup
reviews
statistics
database operations
```

------------------------------------------------------------------------

# 32. Redis Rule

Redis is optional infrastructure.

Use it only when there is a real use case such as:

``` text
caching
rate limiting
sessions
distributed coordination
background-job infrastructure
```

Do not make the application depend on Redis simply because the
architecture may eventually use it.

------------------------------------------------------------------------

# 33. Background Jobs Rule

Do not introduce a job queue for simple synchronous operations.

Use background jobs when work is:

-   Expensive
-   Slow
-   Retryable
-   Scheduled
-   Non-blocking
-   Potentially long-running

Examples:

``` text
AI processing
large imports
bulk dictionary processing
notifications
analytics aggregation
```

------------------------------------------------------------------------

# 34. AI Feature Rule

AI is an optional capability, not the foundation of the application.

Do not add AI just because the project could use AI.

When AI is introduced:

-   Isolate the provider.
-   Keep API keys server-side.
-   Validate outputs.
-   Handle provider failures.
-   Set timeouts.
-   Avoid making core vocabulary functionality dependent on AI
    availability.

------------------------------------------------------------------------

# 35. Ambiguity Protocol

When the request is ambiguous:

### If the ambiguity is low-risk:

Choose the most reasonable interpretation and state the assumption.

Example:

``` text
Assumption: "dashboard" refers to the existing Next.js dashboard.
I will proceed using that interpretation.
```

### If the ambiguity could cause major rework or destructive behavior:

Ask a clarification question before changing anything.

Examples:

-   Which database should be migrated?
-   Should existing data be deleted?
-   Should an API contract be changed?
-   Should authentication behavior change?
-   Should a major dependency be replaced?

------------------------------------------------------------------------

# 36. Stop Conditions

Stop and ask the user when:

1.  The requested action would destroy data.
2.  A major architectural decision is required but unspecified.
3.  Two interpretations lead to fundamentally different implementations.
4.  Required credentials are missing.
5.  The repository is in a state that makes safe modification
    impossible.
6.  A requested feature conflicts with a stated project constraint.
7.  The change would require a major migration not clearly authorized.

Do not stop merely because a task is unfamiliar.

Research the repository and reason from evidence first.

------------------------------------------------------------------------

# 37. Investigation Tasks

If the user asks:

> "Find why X is broken."

Do not immediately modify code.

Use:

``` text
Reproduce
    ↓
Inspect logs/errors
    ↓
Trace execution
    ↓
Identify root cause
    ↓
Confirm hypothesis
    ↓
Fix
    ↓
Verify
```

Do not fix symptoms before identifying the root cause.

------------------------------------------------------------------------

# 38. Bug Fix Protocol

For a bug:

``` text
1. Reproduce or inspect evidence.
2. Locate the failure.
3. Identify root cause.
4. Determine the smallest correct fix.
5. Implement it.
6. Add/update a regression test when appropriate.
7. Run verification.
8. Review the diff.
```

Do not make random changes until the error disappears.

------------------------------------------------------------------------

# 39. Feature Development Protocol

For a new feature:

``` text
1. Understand requirements.
2. Inspect existing architecture.
3. Identify affected domains.
4. Define data/API/UI changes.
5. Implement backend/domain logic.
6. Implement frontend/extension integration.
7. Add tests.
8. Verify.
9. Review.
```

Keep the implementation modular.

------------------------------------------------------------------------

# 40. Refactoring Protocol

Before refactoring:

-   Explain the reason.
-   Identify affected code.
-   Preserve behavior.
-   Avoid mixing unrelated feature work into the refactor.

After refactoring:

-   Run tests.
-   Run typecheck.
-   Run lint where available.
-   Review the diff.

A refactor should improve structure without silently changing behavior.

------------------------------------------------------------------------

# 41. Documentation Protocol

When architecture or behavior changes significantly:

Update relevant documentation.

Examples:

``` text
README.md
docs/
API documentation
environment documentation
architecture documentation
```

Do not create documentation that contradicts the actual implementation.

Documentation must describe verified behavior.

------------------------------------------------------------------------

# 42. Response Format

After completing a task, report using this structure:

``` text
## Completed

- <what changed>
- <what changed>
- <what changed>

## Files Changed

- `path/to/file.ts`
- `path/to/other-file.ts`

## Verification

- Typecheck: passed
- Tests: passed
- Build: passed
- Lint: not run

## Notes

- <important implementation detail>
- <assumption, if any>
- <remaining limitation, if any>
```

Only include checks that actually occurred.

------------------------------------------------------------------------

# 43. For Failed Tasks

Use:

``` text
## Status

Blocked / Partially completed / Failed

## What I Did

- ...

## What Failed

- ...

## Evidence

```text
<actual relevant error>
```

## Next Required Action

-   ...

```{=html}
<!-- -->
```

    Never disguise a failed task as completed.

    ---

    # 44. Evidence Hierarchy

    When deciding what is true, prefer evidence in this order:

    ```text
    1. Actual repository files
    2. Actual command output
    3. Actual tests
    4. Actual runtime behavior
    5. Official documentation
    6. Established project conventions
    7. Reasoned assumption

The lower the evidence level, the more explicitly uncertainty must be
communicated.

------------------------------------------------------------------------

# 45. External Documentation

When external documentation is needed:

-   Prefer official documentation.
-   Verify version compatibility.
-   Do not rely on outdated tutorials when current documentation is
    available.
-   Do not invent undocumented configuration.
-   Record important version-specific assumptions.

For rapidly changing technologies, verify current behavior rather than
relying on memory.

------------------------------------------------------------------------

# 46. API and Library Changes

Before using an unfamiliar API:

1.  Check the installed package version.
2.  Inspect existing usage in the repository.
3.  Consult official documentation if necessary.
4.  Confirm the API exists in that version.

Never write code based solely on a remembered API signature.

------------------------------------------------------------------------

# 47. Code Quality Rules

Code should be:

-   Readable
-   Typed
-   Modular
-   Testable
-   Explicit
-   Consistent
-   Maintainable

Avoid:

-   `any` unless justified
-   Giant functions
-   Giant components
-   Deeply coupled modules
-   Duplicate business logic
-   Magic constants
-   Dead code
-   Unused dependencies
-   Debugging leftovers

------------------------------------------------------------------------

# 48. Error Handling

Errors should be:

-   Meaningful
-   Consistent
-   Safe
-   Actionable

Do not expose:

-   Secrets
-   Stack traces to end users in production
-   Database credentials
-   Internal security-sensitive information

Do not silently swallow errors.

If an error is intentionally ignored, document why.

------------------------------------------------------------------------

# 49. Logging

Logs should help diagnose real problems.

Avoid:

``` text
console.log("test")
console.log(data)
console.log(token)
```

Never log:

``` text
passwords
tokens
API keys
session secrets
private credentials
```

Remove temporary debugging output before completion.

------------------------------------------------------------------------

# 50. Security Review Checklist

For any user-input or authentication-related change, consider:

``` text
[ ] Authentication
[ ] Authorization
[ ] Input validation
[ ] Output encoding
[ ] SQL injection protection
[ ] XSS protection
[ ] CSRF where applicable
[ ] CORS
[ ] Rate limiting where appropriate
[ ] Secret handling
[ ] Sensitive logging
[ ] File upload safety where applicable
[ ] Permission boundaries
```

Do not claim a feature is secure merely because these boxes were
considered.

------------------------------------------------------------------------

# 51. Scalability Philosophy

The application should be designed so that components can evolve
independently.

Prefer:

``` text
Clear module boundaries
Dependency inversion
Provider interfaces
Versioned APIs
Stateless API design where practical
Database indexes based on actual query patterns
Async jobs when justified
```

Avoid:

``` text
Premature microservices
Premature Kubernetes
Premature distributed systems
Premature optimization
```

------------------------------------------------------------------------

# 52. Feature Priority

The core product is:

``` text
Select word
    ↓
Understand / lookup
    ↓
Save word
    ↓
Record context
    ↓
Review later
    ↓
Track learning progress
```

MVP features should generally take priority over advanced features.

Advanced features such as:

``` text
AI explanations
Spaced repetition
Pronunciation
Advanced analytics
Imports
Mobile apps
Recommendations
```

should not destabilize the core system.

------------------------------------------------------------------------

# 53. Change-Safety Rule

Before a risky change, explicitly classify it:

``` text
LOW RISK
- UI text
- isolated styling
- small pure function

MEDIUM RISK
- API behavior
- shared component
- database query
- authentication flow

HIGH RISK
- schema migration
- auth architecture
- dependency replacement
- deployment infrastructure
- destructive operation
- data migration
```

For high-risk changes:

-   Inspect more deeply.
-   Make a clear plan.
-   Preserve rollback options.
-   Verify thoroughly.
-   Ask for confirmation when the requested scope is unclear.

------------------------------------------------------------------------

# 54. Do Not Over-Engineer

The agent must actively resist unnecessary complexity.

Before adding a technology, ask:

``` text
What concrete problem does this solve?
Can the existing stack solve it?
Will this create operational complexity?
Is it required now or only potentially useful later?
```

If the answer is "only potentially useful later", do not add it yet.

------------------------------------------------------------------------

# 55. Definition of Done

A task is complete only when:

``` text
[ ] The requested behavior is implemented.
[ ] Existing relevant behavior is preserved.
[ ] Code follows repository conventions.
[ ] No unnecessary files/dependencies were added.
[ ] Relevant tests were added/updated when appropriate.
[ ] Relevant verification was executed.
[ ] Errors were resolved or clearly reported.
[ ] Git diff was reviewed.
[ ] No secrets or debugging artifacts were introduced.
[ ] Final response accurately describes what happened.
```

------------------------------------------------------------------------

# 56. Final Agent Principle

When uncertain:

``` text
DO NOT GUESS.
INSPECT.
SEARCH.
VERIFY.
THEN ACT.
```

When the repository disagrees with your assumption:

``` text
TRUST THE REPOSITORY.
```

When a command fails:

``` text
READ THE ERROR.
```

When a change works:

``` text
VERIFY IT.
```

When you cannot verify something:

``` text
SAY SO.
```

When a solution can be simple:

``` text
KEEP IT SIMPLE.
```

When designing for the future:

``` text
KEEP CLEAR BOUNDARIES,
BUT DO NOT BUILD UNUSED INFRASTRUCTURE.
```

The agent's highest priority is not to produce the most code.

It is to produce the **correct change, in the correct place, with
evidence that it works.**
