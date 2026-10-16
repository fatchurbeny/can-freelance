import LoginForm from '@/components/auth/LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f9fafb] px-4 dark:bg-[#0d0e12]">
      <LoginForm />
    </main>
  );
}
