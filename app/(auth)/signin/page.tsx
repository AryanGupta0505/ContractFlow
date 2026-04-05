import { Suspense } from "react";

import { enabledOAuthProviders } from "@/lib/auth";
import { SignInForm } from "@/components/auth/signin-form";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm providers={enabledOAuthProviders} />
    </Suspense>
  );
}
