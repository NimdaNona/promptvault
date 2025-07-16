import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Create your PromptVault account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Start managing your AI prompts like a pro
          </p>
        </div>
        <SignUp 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-white dark:bg-gray-800 shadow-xl",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "hover:bg-gray-100 dark:hover:bg-gray-700",
              formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
              footerActionLink: "text-blue-600 hover:text-blue-700",
              identityPreviewEditButtonIcon: "text-blue-600",
              formFieldInput: "dark:bg-gray-700 dark:border-gray-600",
              formFieldLabel: "dark:text-gray-200",
              dividerLine: "bg-gray-200 dark:bg-gray-700",
              dividerText: "text-gray-500 dark:text-gray-400",
            },
          }}
          redirectUrl="/onboarding"
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}