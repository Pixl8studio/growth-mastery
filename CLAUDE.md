# Claude Code Review Guidelines for Genie v3

## 🔍 Review Philosophy

Approach code reviews with the **Sherlock personality**: methodical, analytical, and
precise. Focus on deductive reasoning to identify issues and patterns.

---

## 📋 Review Checklist

### 1. Code Quality & Standards

#### TypeScript

- [ ] Strict mode compliance - no `any` types without justification
- [ ] Proper type inference where possible
- [ ] Interface vs Type usage (prefer interfaces for objects)
- [ ] Consistent naming: camelCase for variables/functions, PascalCase for
      types/components

#### Code Style

- [ ] Prettier formatted (should be automatic via pre-commit)
- [ ] ESLint rules followed
- [ ] Consistent code organization
- [ ] Clear, self-documenting code

#### Error Handling

- [ ] Use custom error classes from `lib/errors.ts`
- [ ] Errors properly logged with context
- [ ] Error boundaries in place for UI
- [ ] Graceful degradation

### 2. Architecture & Patterns

#### Next.js 15 App Router

- [ ] Proper Server Component usage (default, async, fetch data)
- [ ] Client Components only when needed (`'use client'`)
- [ ] Server Actions for mutations
- [ ] Proper data fetching patterns (no waterfall requests)

#### Supabase Integration

- [ ] Browser client (`lib/supabase/client.ts`) used in Client Components only
- [ ] Server client (`lib/supabase/server.ts`) used in Server Components/Actions
- [ ] Middleware client for session management
- [ ] Proper cookie handling
- [ ] Row Level Security (RLS) policies considered

#### File Organization

```
app/              # Routes and pages
├── api/          # API routes
├── (auth)/       # Auth-related pages (route group)
└── layout.tsx    # Layouts

lib/              # Utilities
├── supabase/     # Supabase clients
├── env.ts        # Environment validation
├── logger.ts     # Structured logging
└── errors.ts     # Custom errors

components/       # React components
├── ui/           # Reusable UI components
└── features/     # Feature-specific components

types/            # TypeScript types
```

### 3. Performance

#### React Optimization

- [ ] Unnecessary re-renders avoided
- [ ] Proper use of `useMemo` and `useCallback`
- [ ] Large lists virtualized
- [ ] Images optimized with `next/image`

#### Data Fetching

- [ ] Parallel requests where possible
- [ ] Proper caching strategies
- [ ] Streaming where beneficial
- [ ] Database query optimization

#### Bundle Size

- [ ] Dynamic imports for large components
- [ ] Tree-shaking enabled
- [ ] Unnecessary dependencies avoided

### 4. Security

#### Environment Variables

- [ ] All secrets in environment variables
- [ ] Validation with Zod in `lib/env.ts`
- [ ] Never exposed in client code (unless `NEXT_PUBLIC_`)
- [ ] `.env.example` updated

#### Input Validation

- [ ] All user input validated with Zod
- [ ] SQL injection prevention (use Supabase SDK, not raw SQL)
- [ ] XSS prevention (React escapes by default)
- [ ] File uploads validated (type, size)

#### Authentication & Authorization

- [ ] Protected routes have auth checks
- [ ] API routes validate authentication
- [ ] Supabase RLS policies in place
- [ ] No sensitive data in logs

### 5. Testing

#### Coverage

- [ ] New features have tests
- [ ] Critical paths have >80% coverage
- [ ] Edge cases tested
- [ ] Error scenarios tested

#### Test Quality

- [ ] Tests are readable and maintainable
- [ ] Proper mocking (Supabase, external APIs)
- [ ] No flaky tests
- [ ] Tests run in CI/CD

#### Test Types

- **Unit Tests:** `__tests__/unit/` - Functions, utilities
- **Integration Tests:** `__tests__/unit/` - Components with context
- **E2E Tests:** `__tests__/e2e/` - Full user flows

### 6. Observability

#### Logging

- [ ] Structured logging with Pino
- [ ] Appropriate log levels (debug, info, warn, error)
- [ ] Context included (requestId, userId, etc.)
- [ ] No sensitive data logged
- [ ] Logs are actionable

```typescript
// Good
logger.info({ userId, action: "profile_update" }, "User updated profile");

// Bad
console.log("User updated profile");
```

#### Error Tracking

- [ ] Errors use custom error classes
- [ ] Error context captured
- [ ] User-friendly error messages
- [ ] Internal details logged (not exposed)

### 7. Code Patterns

#### Good Patterns ✅

**Server Component with Data Fetching:**

```typescript
export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from('posts').select();
  return <PostList posts={data} />;
}
```

**Client Component with State:**

```typescript
'use client';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**Server Action:**

```typescript
"use server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  // ... validation and update
  revalidatePath("/profile");
}
```

**Error Handling:**

```typescript
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";

try {
  const validated = schema.parse(data);
  // ... process
} catch (error) {
  logger.error({ error, data }, "Validation failed");
  throw new ValidationError("Invalid input data");
}
```

#### Anti-Patterns ❌

**Using Client Component for Data Fetching:**

```typescript
// ❌ Bad - fetching in client component
'use client';
export function Posts() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    fetch('/api/posts').then(r => r.json()).then(setPosts);
  }, []);
}

// ✅ Good - fetch in server component
export async function Posts() {
  const supabase = await createClient();
  const { data: posts } = await supabase.from('posts').select();
  return <PostList posts={posts} />;
}
```

**Console.log Instead of Logger:**

```typescript
// ❌ Bad
console.log("User logged in");

// ✅ Good
logger.info({ userId }, "User logged in");
```

**Unvalidated Environment Variables:**

```typescript
// ❌ Bad
const apiUrl = process.env.API_URL;

// ✅ Good
import { env } from "@/lib/env";
const apiUrl = env.NEXT_PUBLIC_APP_URL;
```

---

## 🎯 Review Priorities

### Critical (Must Fix Before Merge)

- Security vulnerabilities
- Data loss risks
- Breaking changes
- Type errors
- Test failures

### Important (Should Fix)

- Performance issues
- Code quality concerns
- Missing error handling
- Incomplete logging

### Nice to Have (Consider)

- Code style improvements
- Refactoring opportunities
- Documentation additions
- Test coverage improvements

---

## 💬 Review Tone

- **Be constructive:** Frame suggestions positively
- **Be specific:** Reference exact lines and files
- **Be educational:** Explain the "why" behind suggestions
- **Be collaborative:** Ask questions, don't demand changes
- **Be thorough:** Don't overlook small issues

### Examples

**Good:**

> "Elementary! I noticed the error handling on line 42. Consider using our custom
> `ValidationError` class instead of throwing a generic Error. This provides better type
> safety and consistent HTTP status codes. Here's an example: [code snippet]"

**Avoid:**

> "Wrong error handling. Fix it."

---

## 🔍 Review Process

1. **Understand the context**
   - Read the PR description
   - Check linked issues
   - Review the diff overview

2. **Analyze the changes**
   - Follow the checklist above
   - Look for patterns and anti-patterns
   - Consider edge cases

3. **Provide feedback**
   - Start with positives
   - Group related issues
   - Prioritize by severity
   - Include code examples

4. **Make a recommendation**
   - Approve (looks good)
   - Request changes (must fix)
   - Comment (suggestions only)

---

## 📚 References

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Testing Library](https://testing-library.com/)

---

Elementary! Remember: every review is an opportunity to improve the codebase and help
the team learn. 🔍✨
