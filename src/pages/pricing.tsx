import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Check, 
  Star, 
  Zap, 
  BookOpen, 
  Play, 
  Clock, 
  Users, 
  TrendingUp,
  CreditCard,
  Info
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PaymentSuccessModal } from '@/components/PaymentSuccessModal';

export default function PricingPage() {
  const router = useRouter();
  const { user, supabase } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);

  // Check for payment success parameter
  useState(() => {
    if (router.query.payment_success === 'true' || router.query.payment_finished === 'true') {
      setShowPaymentSuccessModal(true);
      // Clean up URL by removing the payment parameter
      const cleanUrl = router.pathname;
      router.replace(cleanUrl, undefined, { shallow: true });
    }
  }, [router.query.payment_success, router.query.payment_finished]);

  const handleBuyCredits = async (packageType: 'starter' | 'popular' | 'pro') => {
    try {
      setIsLoading(true);
      setError(null);

      if (!user) {
        // Redirect to login with return URL
        router.push(`/login?redirect=${encodeURIComponent('/pricing')}`);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please log in to purchase credits');
        return;
      }

      // Create a checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: session.user.id,
          userEmail: session.user.email,
          returnUrl: `${window.location.origin}/pricing`
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `API Error: ${response.status}`);
      }

      if (data.success && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start checkout process');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Pricing - Curio</title>
        <meta name="description" content="Simple, transparent pricing for transforming YouTube videos into interactive courses" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        <Header />
        
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            {/* Header Section */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold tracking-tight mb-4">
                Simple, Transparent Pricing
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Transform YouTube videos into interactive learning experiences with our credit-based system
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="max-w-3xl mx-auto mb-8">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* How It Works */}
            <Card className="max-w-4xl mx-auto mb-12 border-[#02cced]/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Info className="h-6 w-6 text-[#02cced]" />
                  How Our Credit System Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-[#02cced]/10 rounded-full flex items-center justify-center mx-auto">
                      <CreditCard className="h-8 w-8 text-[#02cced]" />
                    </div>
                    <h3 className="font-semibold">1. Purchase Credits</h3>
                    <p className="text-sm text-muted-foreground">
                      Buy credits to generate courses from YouTube videos
                    </p>
                  </div>
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-[#fdd686]/10 rounded-full flex items-center justify-center mx-auto">
                      <Zap className="h-8 w-8 text-[#fdd686]" />
                    </div>
                    <h3 className="font-semibold">2. Generate Courses</h3>
                    <p className="text-sm text-muted-foreground">
                      Each course generation uses 1 credit from your balance
                    </p>
                  </div>
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                      <Play className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="font-semibold">3. Unlimited Access</h3>
                    <p className="text-sm text-muted-foreground">
                      Access your generated courses forever, no extra fees
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-8 mb-12 max-w-6xl mx-auto">
              {/* Starter Package */}
              <Card className="relative overflow-hidden border-muted/50 hover:border-[#02cced]/30 transition-all duration-300">
                <CardHeader className="relative z-10 text-center pb-2">
                  <CardTitle className="text-2xl">Starter</CardTitle>
                  <CardDescription className="text-base">
                    Try out Curio
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative z-10 space-y-6">
                  <div className="text-center py-4">
                    <div className="text-4xl font-bold">$6.99</div>
                    <p className="text-muted-foreground mt-2">10 credits</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      $0.70 per course
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">10 course generations</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">All core features</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">No expiration</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleBuyCredits('starter')}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full border-[#02cced]/30 hover:border-[#02cced]/60 hover:bg-[#02cced]/10"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#02cced] mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Get Started
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Popular Package */}
              <Card className="relative overflow-hidden border-[#02cced]/30 shadow-xl scale-105">
                {/* Gradient accent */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#02cced]/10 via-transparent to-[#fdd686]/10" />
                
                <CardHeader className="relative z-10 text-center pb-2">
                  <Badge className="w-fit mx-auto mb-4 bg-[#02cced]/10 text-[#02cced] border-[#02cced]/30">
                    MOST POPULAR
                  </Badge>
                  <CardTitle className="text-2xl">Popular</CardTitle>
                  <CardDescription className="text-base">
                    Best value for regular learners
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative z-10 space-y-6">
                  <div className="text-center py-4">
                    <div className="text-4xl font-bold">$19.99</div>
                    <p className="text-muted-foreground mt-2">40 credits</p>
                    <p className="text-sm text-[#02cced] font-medium mt-1">
                      $0.50 per course - Save 29%!
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">40 course generations</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">All core features</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">Priority support</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">29% savings</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleBuyCredits('popular')}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-[#02cced] to-[#02cced]/90 hover:from-[#02cced]/90 hover:to-[#02cced] text-white font-bold shadow-lg hover:shadow-xl"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Star className="h-5 w-5 mr-2" />
                        Get Popular
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Pro Package */}
              <Card className="relative overflow-hidden border-[#fdd686]/30 hover:border-[#fdd686]/60 transition-all duration-300">
                {/* Premium gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#fdd686]/5 via-transparent to-[#c73a3e]/5" />
                
                <CardHeader className="relative z-10 text-center pb-2">
                  <Badge className="w-fit mx-auto mb-4 bg-[#fdd686]/10 text-[#fdd686] border-[#fdd686]/30">
                    BEST DEAL
                  </Badge>
                  <CardTitle className="text-2xl">Pro</CardTitle>
                  <CardDescription className="text-base">
                    For power users & educators
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="relative z-10 space-y-6">
                  <div className="text-center py-4">
                    <div className="text-4xl font-bold">$99.99</div>
                    <p className="text-muted-foreground mt-2">500 credits</p>
                    <p className="text-sm text-[#fdd686] font-medium mt-1">
                      $0.20 per course - Save 60%!
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">500 course generations</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">All core features</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">Priority support</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">Bulk processing</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">60% savings</span>
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleBuyCredits('pro')}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-[#fdd686] to-[#fdd686]/90 hover:from-[#fdd686]/90 hover:to-[#fdd686] text-black font-bold shadow-lg hover:shadow-xl"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5 mr-2" />
                        Go Pro
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Secure Payment Notice */}
            <p className="text-xs text-center text-muted-foreground mb-12">
              🔒 Secure payment powered by Stripe. All prices in USD.
            </p>

            {/* What's Included */}
            <div className="max-w-4xl mx-auto mb-12">
              <h2 className="text-2xl font-bold text-center mb-8">
                What's Included in Every Course
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="border-muted/50">
                  <CardHeader className="pb-3">
                    <BookOpen className="h-8 w-8 text-[#02cced] mb-2" />
                    <CardTitle className="text-lg">Smart Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      AI extracts key concepts and creates structured learning paths
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-muted/50">
                  <CardHeader className="pb-3">
                    <Zap className="h-8 w-8 text-[#fdd686] mb-2" />
                    <CardTitle className="text-lg">Interactive Questions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Context-aware questions that appear at the perfect moments
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-muted/50">
                  <CardHeader className="pb-3">
                    <Clock className="h-8 w-8 text-green-500 mb-2" />
                    <CardTitle className="text-lg">Timestamped Segments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Navigate through topics with precise timestamps
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-muted/50">
                  <CardHeader className="pb-3">
                    <TrendingUp className="h-8 w-8 text-purple-500 mb-2" />
                    <CardTitle className="text-lg">Progress Tracking</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Monitor your learning journey with detailed analytics
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-muted/50">
                  <CardHeader className="pb-3">
                    <Users className="h-8 w-8 text-orange-500 mb-2" />
                    <CardTitle className="text-lg">Share & Collaborate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Share your courses with others and track their progress
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-muted/50">
                  <CardHeader className="pb-3">
                    <Star className="h-8 w-8 text-[#c73a3e] mb-2" />
                    <CardTitle className="text-lg">Course Ratings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Rate courses and see community feedback
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-center mb-8">
                Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Do credits expire?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      No! Your credits never expire. Use them whenever you want to create new courses.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Can I access courses after my credits are used?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Absolutely! Once you generate a course, it's yours forever. You can access, replay, and share it unlimited times.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">What types of videos work best?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Educational content, tutorials, lectures, and how-to videos work best. The clearer the explanations in the video, the better the generated questions.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Is there a limit on video length?</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Videos up to 2 hours long are supported. Longer videos are automatically segmented for optimal learning.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Success Modal */}
      <PaymentSuccessModal 
        open={showPaymentSuccessModal}
        onOpenChange={setShowPaymentSuccessModal}
      />
    </>
  );
}