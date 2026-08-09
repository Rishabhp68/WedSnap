import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: "mx-auto",
          card: "shadow-lg rounded-3xl border border-border",
          headerTitle: "font-display text-2xl",
          formButtonPrimary:
            "bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl",
        },
        variables: {
          colorPrimary: "#62141a",
          borderRadius: "0.75rem",
        },
      }}
    />
  );
}
