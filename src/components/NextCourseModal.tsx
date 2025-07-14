import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, RefreshCw, BookOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StarRating from '@/components/StarRating';
import { supabase } from '@/lib/supabase';

interface NextCourse {
  id: string;
  title: string;
  description: string;
  reasons?: string[];
  addresses_mistakes?: string[];
  channel_name?: string;
  duration?: string;
  difficulty_match?: 'too_easy' | 'perfect' | 'challenging' | 'too_hard';
  progression_type?: 'series_continuation' | 'topic_advancement' | 'reinforcement' | 'prerequisite';
  questionsGenerated?: boolean;
}

interface NextCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextCourse: NextCourse | null;
  isLoadingNextCourse: boolean;
  onStartNextCourse: (courseId: string) => void;
  completedCourseId?: string;
}

export default function NextCourseModal({
  isOpen,
  onClose,
  nextCourse,
  isLoadingNextCourse,
  onStartNextCourse,
  completedCourseId
}: NextCourseModalProps) {
  const [courseRating, setCourseRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  
  // Fetch course rating when modal opens
  useEffect(() => {
    if (isOpen && nextCourse?.id) {
      fetchCourseRating(nextCourse.id);
    }
  }, [isOpen, nextCourse?.id]);
  
  const fetchCourseRating = async (courseId: string) => {
    try {
      const response = await fetch(`/api/courses/${courseId}/ratings`);
      if (response.ok) {
        const data = await response.json();
        setCourseRating(data.averageRating || 0);
        setTotalRatings(data.totalRatings || 0);
      }
    } catch (error) {
      console.error('Failed to fetch course rating:', error);
    }
  };
  
  const handleRateCompletedCourse = async (rating: number) => {
    if (!completedCourseId || isSubmittingRating) return;
    
    setIsSubmittingRating(true);
    try {
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/courses/${completedCourseId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          rating,
          context: 'completion',
          engagementData: {
            timeSpentMinutes: 0,
            questionsAnswered: 0,
            completionPercentage: 100
          }
        })
      });
      
      if (response.ok) {
        setUserRating(rating);
        console.log('✅ Course rated successfully');
      }
    } catch (error) {
      console.error('Failed to submit rating:', error);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const getProgressionIcon = (type?: string) => {
    switch (type) {
      case 'series_continuation':
        return <ArrowRight className="h-4 w-4" />;
      case 'topic_advancement':
        return <ArrowRight className="h-4 w-4" />;
      case 'reinforcement':
        return <RefreshCw className="h-4 w-4" />;
      case 'prerequisite':
        return <BookOpen className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getProgressionLabel = (type?: string) => {
    switch (type) {
      case 'series_continuation':
        return 'Next in Series';
      case 'topic_advancement':
        return 'Next Topic';
      case 'reinforcement':
        return 'Review & Practice';
      case 'prerequisite':
        return 'Foundation Building';
      default:
        return null;
    }
  };

  const getProgressionColor = (type?: string) => {
    switch (type) {
      case 'series_continuation':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'topic_advancement':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'reinforcement':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'prerequisite':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return '';
    }
  };

  const handleStartNextCourse = () => {
    if (nextCourse) {
      console.log('📚 Navigating to next course:', {
        courseId: nextCourse.id,
        title: nextCourse.title,
        questionsGenerated: nextCourse.questionsGenerated,
        progressionType: nextCourse.progression_type,
        nextCourse: nextCourse
      });
      
      // Close modal before navigation
      onClose();
      
      // Call the parent's navigation handler
      onStartNextCourse(nextCourse.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">🎉 Course Complete!</DialogTitle>
          
          {/* Rating for completed course - Prominently placed below title */}
          {completedCourseId && !userRating && (
            <div className="mt-4 mb-6 p-6 bg-gradient-to-br from-[#02cced]/10 to-[#fdd686]/10 rounded-xl border border-[#02cced]/20 space-y-3">
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground mb-2">How was this course?</p>
                <p className="text-sm text-muted-foreground mb-4">Your feedback helps us improve the learning experience</p>
              </div>
              <div className="flex justify-center">
                <StarRating
                  value={userRating}
                  onChange={handleRateCompletedCourse}
                  size="large"
                  animated={true}
                  className="scale-110"
                />
              </div>
              <p className="text-xs text-center text-muted-foreground mt-2">Click a star to rate this course</p>
              {isSubmittingRating && (
                <div className="flex items-center justify-center mt-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#02cced] mr-2"></div>
                  <span className="text-xs text-muted-foreground">Saving your rating...</span>
                </div>
              )}
            </div>
          )}
          
          {/* Show thank you message after rating */}
          {completedCourseId && userRating > 0 && (
            <div className="mt-4 mb-6 p-4 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl border border-green-500/20 text-center">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">✨ Thank you for your feedback!</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">Your rating helps other learners discover great content</p>
            </div>
          )}
          

        </DialogHeader>
        
        {nextCourse ? (
          <div className="space-y-4 my-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm">Up Next:</h3>
                {nextCourse.progression_type && (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs flex items-center gap-1 ${getProgressionColor(nextCourse.progression_type)}`}
                  >
                    {getProgressionIcon(nextCourse.progression_type)}
                    {getProgressionLabel(nextCourse.progression_type)}
                  </Badge>
                )}
              </div>
              <h4 className="font-medium">{nextCourse.title}</h4>
              {/* Course Rating */}
              {courseRating > 0 && (
                <div className="mt-1">
                  <StarRating
                    value={courseRating}
                    readonly={true}
                    size="small"
                    showValue={true}
                    showCount={true}
                    totalRatings={totalRatings}
                  />
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-2">{nextCourse.description}</p>
              
              {/* Enhanced: Why this course? */}
              {nextCourse.reasons && nextCourse.reasons.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h5 className="text-sm font-semibold">Why this course?</h5>
                  <ul className="text-xs space-y-1">
                    {nextCourse.reasons.map((reason, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Enhanced: Addresses mistakes */}
              {nextCourse.addresses_mistakes && nextCourse.addresses_mistakes.length > 0 && (
                <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-xs">
                  <span className="font-semibold text-orange-700 dark:text-orange-400">Helps with: </span>
                  <span className="text-orange-600 dark:text-orange-300">{nextCourse.addresses_mistakes.join(', ')}</span>
                </div>
              )}
              
              {/* Enhanced: Video metadata */}
              <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                {nextCourse.channel_name && (
                  <>
                    <span>{nextCourse.channel_name}</span>
                    <span>•</span>
                  </>
                )}
                {nextCourse.duration && <span>{nextCourse.duration}</span>}
                {nextCourse.difficulty_match && (
                  <>
                    <span>•</span>
                    <Badge variant={
                      nextCourse.difficulty_match === 'perfect' ? 'default' :
                      nextCourse.difficulty_match === 'challenging' ? 'secondary' :
                      'outline'
                    } className="text-xs">
                      {nextCourse.difficulty_match === 'perfect' ? '✓ Perfect match' :
                       nextCourse.difficulty_match === 'challenging' ? 'Challenging' :
                       nextCourse.difficulty_match === 'too_easy' ? 'Review' :
                       'Advanced'}
                    </Badge>
                  </>
                )}
              </div>
              
              {nextCourse.questionsGenerated && (
                <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  Interactive questions generated
                </div>
              )}
            </div>
          </div>
        ) : isLoadingNextCourse ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Generating next course...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <span className="text-muted-foreground">No next course available</span>
          </div>
        )}
        
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            onClick={handleStartNextCourse}
            className="w-full bg-gradient-to-r from-[#02cced] to-[#02cced]/90 hover:from-[#02cced]/90 hover:to-[#02cced] text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
            disabled={!nextCourse || isLoadingNextCourse}
          >
            {isLoadingNextCourse ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Course...
              </>
            ) : (
              'Start Next Course →'
            )}
          </Button>
          <Button 
            onClick={onClose}
            variant="outline"
            className="w-full border-[#02cced]/30 hover:border-[#02cced]/60 hover:bg-[#02cced]/10 text-[#02cced]/80 hover:text-[#02cced]"
          >
            Stay Here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 