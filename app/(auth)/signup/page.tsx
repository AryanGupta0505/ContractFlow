import { Suspense } from "react";

import { enabledOAuthProviders } from "@/lib/auth";
import { SignUpForm } from "@/components/auth/signup-form";

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm providers={enabledOAuthProviders} />
    </Suspense>
  );
}
