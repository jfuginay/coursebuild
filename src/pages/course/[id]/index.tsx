// This page will be the authenticated learning experience
// For now, it's a placeholder that will be developed after auth is implemented

import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function AuthenticatedCoursePage() {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    // TODO: Check if user is authenticated
    // If not, redirect to login with returnUrl
    const isAuthenticated = false; // This will come from auth context
    
    if (!isAuthenticated) {
      router.push(`/login?returnUrl=/course/${id}`);
    }
  }, [id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authenticated Course Page</h1>
        <p className="text-gray-600">This page will contain the full learning experience</p>
        <p className="text-gray-600">Course ID: {id}</p>
      </div>
    </div>
  );
} 