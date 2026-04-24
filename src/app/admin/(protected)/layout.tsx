import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '@/lib/auth.mts';
import { AdminLogoutButton } from '@/components/AdminLogoutButton';

export const dynamic = 'force-dynamic';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuth().api.getSession({ headers: await headers() });

  if (!session || session.user.role !== 'admin') {
    redirect('/admin/login');
  }

  return (
    <div>
      <div className="border-b bg-muted/40 px-6 py-2 flex justify-end items-center gap-3 text-sm">
        <span className="text-muted-foreground">{session.user.email}</span>
        <AdminLogoutButton />
      </div>
      {children}
    </div>
  );
}
