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
import { BackgroundGradient } from '@/components/ui/background-gradient';

interface Course {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  created_at: string;
  published: boolean;
  averageRating?: number;
  totalRatings?: number;
  questionCount?: number;
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
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

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
        // Debug: Log the number of courses fetched from database
        console.log(`📊 Fetched ${data.courses.length} courses from database`);
        
        // Debug: Log the fetched courses to see if questionCount is included
        console.log('🔍 Fetched courses:', data.courses.map((c: Course) => ({
          title: c.title,
          questionCount: c.questionCount,
          averageRating: c.averageRating,
          totalRatings: c.totalRatings
        })));
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
      <div className="w-full space-y-8">
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
            <Card key={index} className="animate-pulse relative overflow-hidden">
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
      <div className="w-full space-y-8">
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
      <div className="w-full space-y-8">
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
    <div className="w-full space-y-8 relative">
      {/* Section with enhanced styling */}
      <div className="relative mb-12">
        <div className="flex items-center justify-between px-4">
          <h2 className="text-4xl font-bold tracking-tight text-foreground">
            Featured Courses
          </h2>
          
          {/* Rating Filter with enhanced styling */}
          <div className="flex items-center gap-2 w-auto bg-muted/20 backdrop-blur-sm rounded-lg p-1">
            <div className="p-2">
              <Filter className="h-4 w-4 text-[#02cced] flex-shrink-0" />
            </div>
            <Select value={ratingFilter} onValueChange={handleRatingFilterChange}>
              <SelectTrigger className="w-40 text-sm border-0 bg-transparent focus:ring-[#02cced]/50">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                <SelectItem value="5">
                  <div className="flex items-center gap-2">
                    <Star className="h-3 w-3 fill-[#fdd686] text-[#fdd686]" />
                    <span>5 Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="4+">
                  <div className="flex items-center gap-2">
                    <Star className="h-3 w-3 fill-[#fdd686] text-[#fdd686]" />
                    <span>4+ Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="3+">
                  <div className="flex items-center gap-2">
                    <Star className="h-3 w-3 fill-[#fdd686] text-[#fdd686]" />
                    <span>3+ Stars</span>
                  </div>
                </SelectItem>
                <SelectItem value="2+">
                  <div className="flex items-center gap-2">
                    <Star className="h-3 w-3 fill-[#fdd686] text-[#fdd686]" />
                    <span>2+ Stars</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayedCourses.map((course, index) => {
          const videoId = extractVideoId(course.youtube_url);
          const thumbnailUrl = videoId 
            ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            : null;

          return (
            <BackgroundGradient
              key={course.id}
              className="rounded-[22px] bg-transparent"
              containerClassName="w-full h-full"
              animate={hoveredCardId === course.id}
            >
              <Card 
                className="group hover:shadow-lg transition-all duration-300 cursor-pointer relative h-full flex flex-col bg-card shadow-md border-0 overflow-hidden rounded-[22px]"
                onClick={() => handleCourseClick(course.id)}
                onMouseEnter={() => setHoveredCardId(course.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                style={{
                  animationDelay: `${index * 100}ms`
                }}
              >
              {/* Geometric accent */}
              <div className="absolute top-0 right-0 w-16 h-16 opacity-5 group-hover:opacity-10 transition-opacity">
                <div className="absolute top-2 right-2 w-12 h-12 border-2 border-muted rounded-full" />
              </div>
              {/* Delete button with enhanced styling - Hidden but preserved for future use */}
              {/* 
              <div className="absolute top-3 right-3 z-10">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 bg-destructive/10 hover:bg-destructive/20 text-destructive hover:text-destructive/90 opacity-0 group-hover:opacity-100 transition-all rounded-full backdrop-blur-sm"
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
              */}

              <CardHeader className="pb-4 flex-shrink-0 relative">
                <div className="w-full text-center">
                  <CardTitle className="text-lg line-clamp-2 text-foreground/90 group-hover:text-foreground transition-colors min-h-[3.5rem] flex items-center justify-center">
                    {course.title}
                  </CardTitle>
                  {/* Rating Display with enhanced styling - only show if rating > 0 AND totalRatings > 0 */}
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col space-y-4">
                {/* Video Thumbnail with overlay effects */}
                <div className="relative aspect-video bg-muted/50 rounded-lg overflow-hidden flex-shrink-0">
                  {thumbnailUrl ? (
                    <>
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
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
                      <Play className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="bg-white/90 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110 shadow-lg">
                      <Play className="h-5 w-5 text-black" />
                    </div>
                  </div>
                </div>

                {/* Course Info - Flexible spacer */}
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs sm:text-sm text-muted-foreground">{formatDate(course.created_at)}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-muted/50 text-muted-foreground border-0 pointer-events-none">
                      {course.questionCount || 0} Questions
                    </Badge>
                  </div>    
                  {/* Call to Action with gradient effect */}
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className={`w-full border-0 transition-all mt-4 font-medium ${
                      hoveredCardId === course.id 
                        ? 'bg-[#ef464a]/20 text-[#ef464a] hover:bg-[#ef464a]/30' 
                        : 'bg-[#02cced]/10 hover:bg-[#02cced]/20 text-[#02cced]'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCourseClick(course.id);
                    }}
                  >
                    <span className="flex items-center justify-center">
                      Start Learning
                      <Play className="ml-2 h-3 w-3" />
                    </span>
                  </Button>
                </div>
              </CardContent>
              </Card>
            </BackgroundGradient>
          );
        })}
      </div>

      {displayedCourses.length < filteredCourses.length && (
        <div className="text-center">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={handleShowMore}
            className="border-[#02cced]/20 hover:border-[#02cced]/40 hover:bg-[#02cced]/5 transition-all group"
          >
            <span className="group-hover:text-[#02cced] transition-colors flex items-center">
              Show More Courses
              <ExternalLink className="ml-2 h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
            </span>
          </Button>
        </div>
      )}
    </div>
  );
} 