import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, BookOpen, Clock, Users, ExternalLink } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  created_at: string;
  published: boolean;
}

interface CoursesShowcaseProps {
  limit?: number;
}

export default function CoursesShowcase({ limit = 6 }: CoursesShowcaseProps) {
  const router = useRouter();
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [displayedCourses, setDisplayedCourses] = useState<Course[]>([]);
  const [coursesToShow, setCoursesToShow] = useState(limit);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    setDisplayedCourses(allCourses.slice(0, coursesToShow));
  }, [allCourses, coursesToShow]);

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
              className="group hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => handleCourseClick(course.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {course.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 mt-1">
                      {course.description}
                    </CardDescription>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ml-2" />
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
                      <BookOpen className="h-3 w-3" />
                      <span>AI Generated</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(course.created_at)}</span>
                    </div>
                  </div>
                  
                  <Badge variant="secondary" className="text-xs">
                    Interactive Course
                  </Badge>
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

      {displayedCourses.length < allCourses.length && (
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