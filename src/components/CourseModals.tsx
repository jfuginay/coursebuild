import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { RatingModal } from '@/components/StarRating';
import { Course } from '@/types/course';

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoginRedirect: () => void;
}

export function LoginModal({ open, onOpenChange, onLoginRedirect }: LoginModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ready to Continue Learning?</DialogTitle>
          <DialogDescription>
            You've completed the free preview! Sign up or log in to:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 my-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Access all course segments</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Track your complete progress</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Get personalized recommendations</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Earn certificates</span>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button 
            onClick={onLoginRedirect}
            className="w-full"
            style={{ backgroundColor: '#8B5CF6' }}
          >
            Sign Up Free
          </Button>
          <Button 
            onClick={onLoginRedirect}
            variant="outline"
            className="w-full"
          >
            I Already Have an Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface NextCourseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextCourse: Course | null;
  isLoadingNextCourse: boolean;
  onStartNextCourse: () => void;
}

export function NextCourseModal({ 
  open, 
  onOpenChange, 
  nextCourse, 
  isLoadingNextCourse,
  onStartNextCourse 
}: NextCourseModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>🎉 Course Complete!</DialogTitle>
          <DialogDescription>
            Great job finishing this course! Ready to continue learning?
          </DialogDescription>
        </DialogHeader>
        {nextCourse ? (
          <div className="space-y-4 my-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold text-sm mb-1">Up Next:</h3>
              <h4 className="font-medium">{nextCourse.title}</h4>
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
            onClick={onStartNextCourse}
            className="w-full"
            disabled={!nextCourse || isLoadingNextCourse}
            style={{ backgroundColor: '#8B5CF6' }}
          >
            {isLoadingNextCourse ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Course...
              </>
            ) : (
              'Start Next Course'
            )}
          </Button>
          <Button 
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="w-full"
          >
            Stay Here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RatingModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  onRate: (rating: number) => void;
  courseTitle?: string;
}

export function RatingModalWrapper({ isOpen, onClose, onRate, courseTitle }: RatingModalWrapperProps) {
  return (
    <RatingModal
      isOpen={isOpen}
      onClose={onClose}
      onRate={onRate}
      courseTitle={courseTitle}
      position="center"
      autoHide={8000}
    />
  );
} 