---
name: frontend-development-standards
description: "Use when: building frontend features, creating new components, implementing data fetching, managing state, setting up routes, or reviewing code for compliance with frontend standards. Defines architecture patterns, design patterns, data management, and implementation guidelines for all frontend development."
---

# Frontend Development Standards

## Core Principles

This skill enforces **feature-based architecture** with modern design patterns, comprehensive state management strategies, and standardized error handling. All frontend code must follow these standards to maintain consistency, scalability, and performance.

---

## 0. Rule of Thumb: When to Use `useEffect`

Use an Effect only when the component needs to synchronize with something **outside React**.

**External systems include:**

- APIs and other network systems
- Browser APIs such as the DOM, timers, and storage
- WebSockets and other subscriptions

**Do not use an Effect for:**

- Form validation
- Calculating derived state
- Handling user events

Prefer render-time calculations for derived values and event handlers for user interactions. Use state only when the value represents local UI state that cannot be derived from existing props or state.

---

## 1. Design Patterns

### 1.1 Container/Presentational Pattern

- **Container Components**: Handle data fetching, state management, and business logic
- **Presentational Components**: Render UI without side effects; receive data via props
- **Benefit**: Improves testability, reusability, and separation of concerns

**Example Structure:**

```typescript
// Container: features/auth/screens/LoginContainer.tsx
const LoginContainer = () => {
  const { login, isLoading } = useAuth();
  return <LoginPresentation onSubmit={login} isLoading={isLoading} />;
};

// Presentational: features/auth/components/LoginPresentation.tsx
const LoginPresentation = ({ onSubmit, isLoading }) => (
  <Form onSubmit={onSubmit}>...</Form>
);
```

### 1.2 Custom Hooks Pattern

- Encapsulate reusable logic in hooks: `useAuth`, `usePagination`, `useDebounce`, `useFetch`
- Located in `features/{domain}/hooks/`
- One hook per file
- Must include TypeScript types

**Key Hooks:**

```typescript
// hooks/useAuth.ts - Authentication logic
export const useAuth = () => ({ login, logout, user, isAuthenticated });

// hooks/usePagination.ts - Pagination logic
export const usePagination = (pageSize) => ({
  page,
  pageSize,
  goTo,
  next,
  prev,
});

// hooks/useDebounce.ts - Debounce input
export const useDebounce = (value, delay) => debounced_value;

// hooks/useFetch.ts - Data fetching wrapper
export const useFetch = (url, options) => ({ data, loading, error });
```

### 1.3 Feature-Based Folder Structure

Organize code by **business domain**, not technical layers:

```
features/
├── auth/
│   ├── index.ts                    # Public exports
│   ├── types.ts                    # TypeScript types/interfaces
│   ├── components/                 # Presentational components
│   │   ├── LoginForm.tsx
│   │   └── RegisterForm.tsx
│   ├── screens/                    # Container components (full screens)
│   │   ├── LoginScreen.tsx
│   │   └── RegisterScreen.tsx
│   ├── hooks/                      # Custom hooks
│   │   ├── useAuth.ts
│   │   └── useAuthForm.ts
│   ├── services/                   # API calls & data operations
│   │   └── authService.ts
│   ├── schemas/                    # Validation schemas (Zod, Yup)
│   │   └── loginSchema.ts
│   └── store/                      # Feature-specific state (Zustand)
│       └── authStore.ts
├── document/
├── profile/
└── user/
```

**Rules:**

- Each feature is independent and self-contained
- No cross-feature imports except via `index.ts`
- Share code via `components/`, `hooks/`, `services/` at root level if needed

### 1.4 Guarded Routes Pattern

Implement centralized access control:

```typescript
// app/guards/RouteGuard.tsx
type UserRole = 'guest' | 'user' | 'admin' | 'moderator';

interface GuardConfig {
  route: string;
  requiredRoles: UserRole[];
}

const RouteGuard: React.FC<{ children: React.ReactNode; guard: GuardConfig }> =
  ({ children, guard }) => {
    const { user } = useAuth();
    const hasAccess = guard.requiredRoles.includes(user?.role);

    if (!hasAccess) return <Redirect to="/unauthorized" />;
    return children;
  };

// Usage in routing
export const authRoutes: GuardConfig[] = [
  { route: '/admin/users', requiredRoles: ['admin'] },
  { route: '/profile', requiredRoles: ['user', 'admin', 'moderator'] },
];
```

### 1.5 Error Boundary Pattern

Wrap sections to prevent full app crashes:

```typescript
// components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, errorInfo);
    this.setState({ hasError: true });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.reset} />;
    }
    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <DocumentGrid />
</ErrorBoundary>
```

### 1.6 Service/Repository Pattern

Centralize all API calls and data operations:

```typescript
// features/document/services/documentService.ts
export const documentService = {
  getAll: async (params?: FetchParams) => {
    const response = await apiClient.get("/documents", { params });
    return normalizeDocumentResponse(response);
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/documents/${id}`);
    return normalizeDocumentResponse(response);
  },

  create: async (data: CreateDocumentDTO) => {
    const response = await apiClient.post("/documents", data);
    return normalizeDocumentResponse(response);
  },

  update: async (id: string, data: UpdateDocumentDTO) => {
    const response = await apiClient.put(`/documents/${id}`, data);
    return normalizeDocumentResponse(response);
  },

  delete: async (id: string) => {
    await apiClient.delete(`/documents/${id}`);
  },
};

// Component never calls API directly
// const response = await documentService.getAll();
```

### 1.7 UI State Pattern

Standardize the 4-state pattern for async operations:

```typescript
interface UIState {
  status: 'loading' | 'error' | 'empty' | 'success';
  data: T | null;
  error: Error | null;
}

// Component rendering
{ui.status === 'loading' && <Skeleton />}
{ui.status === 'error' && <ErrorMessage error={ui.error} />}
{ui.status === 'empty' && <EmptyState />}
{ui.status === 'success' && <Content data={ui.data} />}
```

### 1.8 Optimistic Update Pattern

Update UI immediately, rollback on failure:

```typescript
const updateDocument = async (id: string, updates: Partial<Document>) => {
  // 1. Optimistic: Update state immediately
  const previousData = queryClient.getQueryData(["document", id]);
  queryClient.setQueryData(["document", id], (old) => ({
    ...old,
    ...updates,
  }));

  try {
    // 2. Server: Perform actual update
    const response = await documentService.update(id, updates);

    // 3. Confirm: Update with server response
    queryClient.setQueryData(["document", id], response);
  } catch (error) {
    // 4. Rollback: Revert to previous state
    queryClient.setQueryData(["document", id], previousData);
    throw error;
  }
};
```

### 1.9 Retry + Backoff Pattern

Automatic retry for transient network failures:

```typescript
// services/api/axiosClient.ts
const axiosClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
});

// Request interceptor
axiosClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor with retry
axiosClient.interceptors.response.use(
  (response) => normalizeResponse(response),
  async (error) => {
    const config = error.config;

    // Retry logic
    if (isNetworkError(error) && config.retryCount < 3) {
      config.retryCount = (config.retryCount || 0) + 1;

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, config.retryCount - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      return axiosClient(config);
    }

    return Promise.reject(error);
  },
);
```

---

## 2. State Management Strategy

### 2.1 ReactQuery (TanStack Query)

**Use for:** Server-side data (API calls, caching, synchronization)

```typescript
// features/document/hooks/useDocuments.ts
export const useDocuments = (filters?: DocumentFilters) => {
  return useQuery({
    queryKey: ["documents", filters],
    queryFn: () => documentService.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.pow(2, attemptIndex) * 1000,
  });
};

// Mutations for create/update/delete
export const useCreateDocument = () => {
  return useMutation({
    mutationFn: (data: CreateDocumentDTO) => documentService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
};
```

### 2.2 useState

**Use for:** Local UI state (form inputs, toggles, local filters)

```typescript
const [filters, setFilters] = useState<DocumentFilters>({
  search: "",
  category: "all",
  sortBy: "recent",
});

const [isFilterOpen, setIsFilterOpen] = useState(false);
```

### 2.3 Zustand

**Use for:** Global state (authentication, theme, user preferences)

```typescript
// stores/authStore.ts
export const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (credentials) => {
    const response = await authService.login(credentials);
    set({ user: response.user, isAuthenticated: true });
  },

  logout: () => set({ user: null, isAuthenticated: false }),
}));

// stores/themeStore.ts
export const useThemeStore = create((set) => ({
  isDarkMode: false,
  toggle: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
}));

// Usage in components
const { user, login } = useAuthStore();
const { isDarkMode, toggle } = useThemeStore();
```

---

## 3. API Integration

### 3.1 Axios Configuration

```typescript
// services/api/axiosClient.ts
export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      useAuthStore.setState({ isAuthenticated: false });
    }
    return Promise.reject(error);
  },
);
```

### 3.2 Response Normalization

```typescript
// services/api/normalizers.ts
export const normalizeDocumentResponse = (response: any) => ({
  id: response.data.id,
  title: response.data.title,
  content: response.data.content,
  createdAt: new Date(response.data.created_at),
  updatedAt: new Date(response.data.updated_at),
});

// Used in service
export const documentService = {
  getAll: async (params?: FetchParams) => {
    const response = await apiClient.get("/documents", { params });
    return response.data.map(normalizeDocumentResponse);
  },
};
```

### 3.3 Validation Schemas

```typescript
// features/auth/schemas/loginSchema.ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

---

## 4. Component Implementation Checklist

- [ ] Container component uses custom hooks
- [ ] Presentational component receives all data via props
- [ ] API calls only in services, not components
- [ ] ReactQuery used for server data
- [ ] useState used only for local UI state
- [ ] Global state in Zustand
- [ ] Error handling with try-catch or ErrorBoundary
- [ ] Loading state properly displayed
- [ ] Empty state when no data
- [ ] All props have TypeScript types
- [ ] No prop drilling (max 2-3 levels)
- [ ] Custom hook for shared logic
- [ ] Validation on form submission
- [ ] Optimistic updates for mutations
- [ ] Proper TypeScript types in services

---

## 5. File Naming Conventions

| File Type  | Convention                         | Example                                |
| ---------- | ---------------------------------- | -------------------------------------- |
| Components | PascalCase                         | `UserProfile.tsx`, `DocumentGrid.tsx`  |
| Services   | camelCase                          | `documentService.ts`, `authService.ts` |
| Hooks      | camelCase with `use` prefix        | `useAuth.ts`, `usePagination.ts`       |
| Stores     | camelCase with `Store` suffix      | `authStore.ts`, `themeStore.ts`        |
| Types      | PascalCase with `DTO` or no suffix | `User.ts`, `CreateDocumentDTO.ts`      |
| Schemas    | camelCase with `Schema` suffix     | `loginSchema.ts`, `documentSchema.ts`  |

---

## 6. TypeScript Requirements

- All functions must have return type annotations
- All props must be typed (no `any`)
- Use `interface` for object shapes, `type` for unions
- Extend common types: `React.FC`, `React.ReactNode`

```typescript
interface DocumentProps {
  id: string;
  title: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}

const Document: React.FC<DocumentProps> = ({ id, title, onEdit, onDelete }) => (
  <div>...</div>
);
```

---

## 7. Common Patterns Reference

### Form with Validation

```typescript
const LoginForm: React.FC = () => {
  const form = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });
  const { mutate: login, isPending } = useLoginMutation();

  return (
    <form onSubmit={form.handleSubmit(data => login(data))}>
      <input {...form.register('email')} />
      {form.formState.errors.email && <span>{form.formState.errors.email.message}</span>}
    </form>
  );
};
```

### Infinite Scroll / Pagination

```typescript
const DocumentList: React.FC = () => {
  const { data, isLoading, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ['documents'],
    queryFn: ({ pageParam = 1 }) => documentService.getAll({ page: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  return (
    <InfiniteScroll
      dataLength={data?.pages.length || 0}
      next={fetchNextPage}
      hasMore={hasNextPage}
    >
      {data?.pages.map(page => page.documents.map(doc => <DocumentCard key={doc.id} {...doc} />))}
    </InfiniteScroll>
  );
};
```

---

## Summary

✅ **DO:**

- Use feature-based folder organization
- Separate containers and presentational components
- Use ReactQuery for server data
- Centralize API calls in services
- Implement proper error boundaries
- Follow the 4-state UI pattern
- Use custom hooks for shared logic

❌ **DON'T:**

- Call API directly from components
- Mix business logic with UI logic
- Use excessive prop drilling
- Mutate data directly without proper state management
- Ignore TypeScript types
- Leave error states unhandled
- Forget loading and empty states
