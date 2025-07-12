import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  data?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const results: TestResult[] = [];

  // Test 1: Check if user_course_ratings table exists
  try {
    const { error } = await supabase
      .from('user_course_ratings')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      results.push({
        test: 'user_course_ratings_table',
        status: 'fail',
        message: `Table does not exist or is not accessible: ${error.message}`
      });
    } else {
      results.push({
        test: 'user_course_ratings_table',
        status: 'pass',
        message: 'Table exists and is accessible'
      });
    }
  } catch (error) {
    results.push({
      test: 'user_course_ratings_table',
      status: 'fail',
      message: `Error checking table: ${error}`
    });
  }

  // Test 2: Check if course_rating_stats view exists
  try {
    const { error } = await supabase
      .from('course_rating_stats')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      results.push({
        test: 'course_rating_stats_view',
        status: 'fail',
        message: `View does not exist or is not accessible: ${error.message}`
      });
    } else {
      results.push({
        test: 'course_rating_stats_view',
        status: 'pass',
        message: 'Materialized view exists and is accessible'
      });
    }
  } catch (error) {
    results.push({
      test: 'course_rating_stats_view',
      status: 'fail',
      message: `Error checking view: ${error}`
    });
  }

  // Test 3: Check if we can get courses data
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select('id, title')
      .eq('published', true)
      .limit(1);
    
    if (error) {
      results.push({
        test: 'courses_access',
        status: 'fail',
        message: `Cannot access courses: ${error.message}`
      });
    } else {
      results.push({
        test: 'courses_access',
        status: 'pass',
        message: `Found ${courses?.length || 0} courses`,
        data: courses?.[0]
      });
    }
  } catch (error) {
    results.push({
      test: 'courses_access',
      status: 'fail',
      message: `Error accessing courses: ${error}`
    });
  }

  // Test 4: Check if we can read rating endpoints
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'}/api/courses`, {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      results.push({
        test: 'courses_api',
        status: 'pass',
        message: `API returned ${data.courses?.length || 0} courses`,
        data: { 
          hasRatingData: data.courses?.[0]?.averageRating !== undefined,
          firstCourse: data.courses?.[0]
        }
      });
    } else {
      results.push({
        test: 'courses_api',
        status: 'fail',
        message: `API returned ${response.status}: ${response.statusText}`
      });
    }
  } catch (error) {
    results.push({
      test: 'courses_api',
      status: 'warning',
      message: `Could not test API endpoint: ${error}`
    });
  }

  const overallStatus = results.some(r => r.status === 'fail') ? 'fail' : 
                      results.some(r => r.status === 'warning') ? 'warning' : 'pass';

  return res.status(200).json({
    overall: overallStatus,
    timestamp: new Date().toISOString(),
    results
  });
}