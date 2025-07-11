import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Play, BookOpen, Clock, Users, ExternalLink, Trash2, Filter, Star } from 'lucide-react';
import { CompactStarRating } from '@/components/StarRating';
import { useAnalytics } from '@/hooks/useAnalytics';

interface Course {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  created_at: string;
  published: boolean;
  averageRating?: number;
  totalRatings?: number;
}

interface CoursesShowcaseProps {
  limit?: number;
}

type RatingFilter = 'all' | '4+' | '3+' | '2+' | '5';

export default function CoursesShowcase({ limit = 6 }: CoursesShowcaseProps) {
  const router = useRouter();
  const { trackFilter } = useAnalytics();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [displayedCourses, setDisplayedCourses] = useState<Course[]>([]);
  const [coursesToShow, setCoursesToShow] = useState(limit);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingCourseId, setDeletingCourseId] = useState<string | null>(null);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    setDisplayedCourses(filteredCourses.slice(0, coursesToShow));
  }, [filteredCourses, coursesToShow]);

  useEffect(() => {
    applyRatingFilter();
  }, [allCourses, ratingFilter]);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/courses');
      const data = await response.json();

      if (data.success) {
        setAllCourses(data.courses);
      } else {
        setError('Failed to fetch courses');
      }
    } catch (err) {
      setError('Error loading courses');
      console.error('Error fetching courses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyRatingFilter = () => {
    let filtered = [...allCourses];
    
    // Debug: Log all courses with their rating data
    console.log('🔍 Rating Filter Debug:', {
      totalCourses: allCourses.length,
      currentFilter: ratingFilter,
      coursesWithRatings: allCourses.filter(c => c.averageRating && c.averageRating > 0).length,
      allCoursesData: allCourses.map(c => ({
        id: c.id,
        title: c.title,
        averageRating: c.averageRating,
        totalRatings: c.totalRatings
      }))
    });
    
    if (ratingFilter === '5') {
      // For "5 Stars" filter, show courses with 4.5+ rating (rounded to 5 stars)
      filtered = filtered.filter(course => (course.averageRating || 0) >= 4.5);
    } else if (ratingFilter === '4+') {
      filtered = filtered.filter(course => (course.averageRating || 0) >= 4.0);
    } else if (ratingFilter === '3+') {
      filtered = filtered.filter(course => (course.averageRating || 0) >= 3.0);
    } else if (ratingFilter === '2+') {
      filtered = filtered.filter(course => (course.averageRating || 0) >= 2.0);
    }
    
    console.log('📊 Filter Results:', {
      filter: ratingFilter,
      originalCount: allCourses.length,
      filteredCount: filtered.length,
      filteredCourses: filtered.map(c => ({
        title: c.title,
        averageRating: c.averageRating,
        totalRatings: c.totalRatings
      }))
    });
    
    setFilteredCourses(filtered);
    setCoursesToShow(limit); // Reset pagination when filter changes
  };

  const handleRatingFilterChange = (value: RatingFilter) => {
    const previousFilter = ratingFilter;
    setRatingFilter(value);
    
    // Calculate results count for the new filter
    let resultsCount = allCourses.length;
    if (value === '5') {
      resultsCount = allCourses.filter(course => (course.averageRating || 0) >= 4.5).length;
    } else if (value === '4+') {
      resultsCount = allCourses.filter(course => (course.averageRating || 0) >= 4.0).length;
    } else if (value === '3+') {
      resultsCount = allCourses.filter(course => (course.averageRating || 0) >= 3.0).length;
    } else if (value === '2+') {
      resultsCount = allCourses.filter(course => (course.averageRating || 0) >= 2.0).length;
    }
    
    // Additional debug logging
    console.log('🎯 Rating Filter Change:', {
      newFilter: value,
      totalCourses: allCourses.length,
      expectedResults: resultsCount,
      coursesWithRatings: allCourses.filter(c => c.averageRating && c.averageRating > 0).length
    });
    
    // Track filter usage with error handling
    try {
      trackFilter({
        filterType: 'rating',
        filterValue: value,
        resultsCount,
        previousFilters: [previousFilter]
      });
    } catch (error) {
      console.warn('Failed to track filter usage:', error);
      // Continue without blocking functionality
    }
  };

  const handleShowMore = () => {
    setCoursesToShow(prev => prev + 6);
  };

  const extractVideoId = (url: string): string => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return '';
  };

  const handleCourseClick = (courseId: string) => {
    router.push(`/course/${courseId}`);
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      setDeletingCourseId(courseId);
      
      const response = await fetch(`/api/course/${courseId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Remove the course from the local state
        setAllCourses(prev => prev.filter(course => course.id !== courseId));
        setDisplayedCourses(prev => prev.filter(course => course.id !== courseId));
      } else {
        setError('Failed to delete course');
        console.error('Delete error:', data.message);
      }
    } catch (err) {
      setError('Error deleting course');
      console.error('Error deleting course:', err);
    } finally {
      setDeletingCourseId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">
            Featured Courses
          </h2>
          <p className="text-lg text-muted-foreground">
            Loading courses...
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="aspect-video bg-muted rounded-lg"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">
            Featured Courses
          </h2>
          <p className="text-lg text-muted-foreground text-red-500">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (allCourses.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">
            Featured Courses
          </h2>
          <p className="text-lg text-muted-foreground">
            No courses available yet. Be the first to create one!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold tracking-tight">
          Featured Courses
        </h2>
        <p className="text-lg text-muted-foreground">
          Explore Community Created Courses
        </p>
        
        {/* Rating Filter */}
        <div className="flex justify-center px-4">
          <div className="flex items-center gap-2 w-full max-w-xs sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Select value={ratingFilter} onValueChange={handleRatingFilterChange}>
              <SelectTrigger className="w-full sm:w-40 text-sm">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem value="5">
                  <div className="flex items-center gap-2">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>5 Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="4+">
                  <div className="flex items-center gap-2">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>4+ Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="3+">
                  <div className="flex items-center gap-2">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>3+ Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="2+">
                  <div className="flex items-center gap-2">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>2+ Stars</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedCourses.map((course) => {
          const videoId = extractVideoId(course.youtube_url);
          const thumbnailUrl = videoId 
            ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            : null;

          return (
            <Card 
              key={course.id} 
              className="group hover:shadow-lg transition-all duration-300 cursor-pointer relative"
              onClick={() => handleCourseClick(course.id)}
            >
              {/* Delete button in top right corner */}
              <div className="absolute top-3 right-3 z-10">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 bg-red-500/10 hover:bg-red-500/20 text-red-600 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                      disabled={deletingCourseId === course.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Course</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{course.title}"? This will permanently remove the course and all its questions. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCourse(course.id);
                        }}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={deletingCourseId === course.id}
                      >
                        {deletingCourseId === course.id ? 'Deleting...' : 'Delete Course'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-8">
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </CardTitle>
                    {/* Rating Display - Prominent placement */}
                    <div className="mt-2">
                      <CompactStarRating 
                        rating={course.averageRating || 0} 
                        totalRatings={course.totalRatings || 0}
                        showRatingText={true}
                        size="sm"
                        className="text-yellow-500"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Video Thumbnail */}
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  {thumbnailUrl ? (
                    <img 
                      src={thumbnailUrl}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback to smaller resolution thumbnails
                        const img = e.target as HTMLImageElement;
                        const currentSrc = img.src;
                        
                        if (currentSrc.includes('maxresdefault.jpg')) {
                          img.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        } else if (currentSrc.includes('hqdefault.jpg')) {
                          img.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                        } else if (currentSrc.includes('mqdefault.jpg')) {
                          img.src = `https://img.youtube.com/vi/${videoId}/default.jpg`;
                        } else {
                          // All thumbnails failed, hide the image
                          img.style.display = 'none';
                          const parentDiv = img.parentElement;
                          if (parentDiv) {
                            parentDiv.innerHTML = `
                              <div class="w-full h-full flex items-center justify-center">
                                <div class="text-center">
                                  <div class="h-8 w-8 mx-auto mb-2 opacity-50">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.55-2.55a.999.999 0 011.45.89v6.32a.999.999 0 01-1.45.89L15 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h8a2 2 0 012 2v3z"/>
                                    </svg>
                                  </div>
                                  <p class="text-xs text-muted-foreground">Video Thumbnail</p>
                                </div>
                              </div>
                            `;
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                    <div className="bg-white/90 group-hover:bg-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Play className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </div>

                {/* Course Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs sm:text-sm">{formatDate(course.created_at)}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      AI Enhanced Course
                    </Badge>
                  </div>
                </div>

                {/* Call to Action */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCourseClick(course.id);
                  }}
                >
                  Start Learning
                  <Play className="ml-2 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {displayedCourses.length < filteredCourses.length && (
        <div className="text-center">
          <Button variant="outline" size="lg" onClick={handleShowMore}>
            Show More Courses
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
} 