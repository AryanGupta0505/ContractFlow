import { enabledOAuthProviders } from "@/lib/auth";
import { SignInForm } from "@/components/auth/signin-form";

export default function SignInPage() {
  return <SignInForm providers={enabledOAuthProviders} />;
}
