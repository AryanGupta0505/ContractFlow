import { enabledOAuthProviders } from "@/lib/auth";
import { SignUpForm } from "@/components/auth/signup-form";

export default function SignUpPage() {
  return <SignUpForm providers={enabledOAuthProviders} />;
}
