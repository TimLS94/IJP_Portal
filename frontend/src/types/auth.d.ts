declare module "@/context/AuthContext" {
  interface User {
    id: number;
    email: string;
    role: "applicant" | "company" | "admin";
  }

  interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<User>;
    setAuth: (token: string, userData: User) => void;
    registerApplicant: (
      email: string,
      password: string,
      firstName: string,
      lastName: string,
      sourceToken?: string | null
    ) => Promise<User>;
    registerCompany: (
      email: string,
      password: string,
      companyName: string
    ) => Promise<User>;
    logout: () => void;
    isAuthenticated: boolean;
    isApplicant: boolean;
    isCompany: boolean;
    isAdmin: boolean;
  }

  export function AuthProvider(props: { children: React.ReactNode }): JSX.Element;
  export function useAuth(): AuthContextType;
}
