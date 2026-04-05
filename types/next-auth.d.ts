import { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      organizationId?: string;
      organizationName?: string;
      role?: "ADMIN" | "MANAGER" | "EMPLOYEE";
    };
  }

  interface User {
    id: string;
    organizationId?: string;
    organizationName?: string;
    role?: "ADMIN" | "MANAGER" | "EMPLOYEE";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    organizationId?: string;
    organizationName?: string;
    role?: "ADMIN" | "MANAGER" | "EMPLOYEE";
  }
}
