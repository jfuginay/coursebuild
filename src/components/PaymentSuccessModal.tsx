import React from 'react';
import { useRouter } from 'next/router';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap, BookOpen, Play, Sparkles } from 'lucide-react';

interface PaymentSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  open,
  onOpenChange,
}) => {
  const router = useRouter();

  const handleGoToHomepage = () => {
    onOpenChange(false);
    router.push('/');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-6 w-6 text-[#02cced] animate-pulse" />
              </div>
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-bold">
            Payment Successful!
          </DialogTitle>
          <DialogDescription className="text-center text-lg">
            Welcome to Curio Pro! Your credits have been added to your account.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* How Credits Work */}
          <Card className="border-[#02cced]/20 bg-gradient-to-r from-[#02cced]/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-[#02cced]" />
                How Credits Work
              </CardTitle>
              <CardDescription>
                Each course generation consumes credits from your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#02cced]/10 rounded-full flex items-center justify-center">
                    <BookOpen className="h-4 w-4 text-[#02cced]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Course Generation</p>
                    <p className="text-xs text-muted-foreground">
                      Each YouTube video you transform into a course costs 1 credit
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs border-[#02cced]/30 text-[#02cced]">
                    1 Credit
                  </Badge>
                </div>
                
                <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500/10 rounded-full flex items-center justify-center">
                    <Play className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Course Access</p>
                    <p className="text-xs text-muted-foreground">
                      Once generated, access your courses unlimited times for free
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs border-green-500/30 text-green-500">
                    Free
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What You Get */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-[#fdd686]" />
                What You Get With Each Credit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-[#02cced] rounded-full" />
                  AI-powered video analysis
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-[#02cced] rounded-full" />
                  Interactive quiz questions
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-[#02cced] rounded-full" />
                  Timestamped segments
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-[#02cced] rounded-full" />
                  Progress tracking
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-[#02cced] rounded-full" />
                  Key concept extraction
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-[#02cced] rounded-full" />
                  Visual question overlays
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="border-[#fdd686]/20 bg-gradient-to-r from-[#fdd686]/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                💡 Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-[#fdd686] rounded-full mt-2 flex-shrink-0" />
                  <p>Educational and tutorial videos work best for course generation</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-[#fdd686] rounded-full mt-2 flex-shrink-0" />
                  <p>Videos with clear explanations generate higher quality questions</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-[#fdd686] rounded-full mt-2 flex-shrink-0" />
                  <p>Your generated courses are saved permanently in your account</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter>
          <Button 
            onClick={handleGoToHomepage} 
            className="w-full bg-[#02cced] hover:bg-[#02cced]/90 text-white font-semibold"
            size="lg"
          >
            Start Creating Courses
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 