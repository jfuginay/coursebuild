# Product Requirements Document: Course Rating System

## 📖 Overview

### Product Vision
Create an intuitive, seamless 5-star rating system for CourseBuild that balances subtle user experience with clear rating visibility. The system should feel natural and effortless while providing valuable course quality indicators for all users.

### Mission Statement
"Enable users to discover high-quality courses through a fluid rating experience that feels like a natural extension of the learning journey, not an interruption."

---

## 🎯 Objectives & Key Results (OKRs)

### Objective 1: Seamless Rating Experience
- **KR1**: 85% of course completions result in a rating (target: frictionless rating flow)
- **KR2**: Average time-to-rate < 3 seconds from rating prompt appearance
- **KR3**: < 2% rating abandonment rate once rating UI is triggered

### Objective 2: Enhanced Course Discovery
- **KR1**: 90% of users engage with rating filters within first 3 sessions
- **KR2**: 40% improvement in course completion rates for 4+ star courses
- **KR3**: 60% of users consider ratings when selecting courses (user survey)

### Objective 3: Quality Feedback Loop
- **KR1**: Achieve 4.2+ average platform rating within 6 months
- **KR2**: 25% increase in repeat course creation from highly-rated course creators
- **KR3**: Correlation coefficient > 0.7 between rating and completion rate

---

## 👥 Target Users

### Primary Users
- **Learners**: Seeking quality educational content and wanting to share feedback
- **Course Creators**: Needing feedback to improve content quality
- **Casual Browsers**: Looking for highly-rated content for quick learning

### User Personas

#### "Sarah the Continuous Learner" 
- Completes 2-3 courses per week
- Values efficiency and quality content
- Likely to rate if the experience is seamless
- Uses ratings to discover new courses

#### "Mike the Quality Seeker"
- Selective about course choices
- Heavily relies on ratings and reviews
- Wants detailed filtering options
- Appreciates transparent quality indicators

#### "Emma the Creator"
- Creates courses for the platform
- Wants constructive feedback on content
- Uses ratings to gauge content effectiveness
- Motivated by positive ratings to create more content

---

## ✨ Core Features

### 1. **Intelligent Rating Triggers**

#### Micro-Moment Rating Prompts
- **Post-Question Success**: Subtle rating prompt after correct answers
- **Natural Break Points**: Appear during video pauses or transitions
- **Course Completion**: Prominent but non-blocking rating request
- **Quality Indicators**: Triggered by engagement signals (replay, bookmark, share)

#### Smart Timing Algorithm
```
Rating Prompt Triggers:
- 75% course completion + high engagement score
- Immediately after answering 3+ questions correctly
- After user manually pauses video for >10 seconds
- Course completion (primary trigger)
- User initiates share/bookmark action
```

### 2. **Fluid Rating Interface**

#### Animated Star System
- **Hover States**: Stars fill with smooth color gradient animation
- **Interactive Feedback**: Subtle haptic feedback on mobile devices
- **Visual Polish**: Smooth scale animations and micro-interactions
- **Accessibility**: ARIA labels, keyboard navigation, high contrast support

#### Context-Aware Positioning
- **Floating Overlay**: Non-intrusive positioning that adapts to video player
- **Mobile Optimization**: Thumb-friendly placement and sizing
- **Auto-Dismiss**: Fades away after 8 seconds if no interaction
- **One-Tap Rating**: Single tap/click rates and dismisses interface

### 3. **Seamless Integration Points**

#### Course End Experience
```
Course Completion Flow:
1. Video ends → 2s delay
2. Celebration micro-animation
3. Rating stars fade in with subtle pulse
4. "How was this course?" text appears
5. User rates or auto-dismiss after 8s
6. "Thank you!" confirmation + next course suggestion
```

#### Quick Rating Moments
- **Question Overlay**: Micro-rating option in question success state
- **Video Controls**: Optional star icon in video player controls
- **Course Card Hover**: Quick rate option on course library cards

### 4. **Advanced Filtering & Discovery**

#### Smart Filter Interface
- **Rating Slider**: Visual slider with star indicators (2.5★ - 5★)
- **Quick Filters**: "Highly Rated (4★+)", "Community Favorites (4.5★+)"
- **Combined Filters**: Rating + duration, rating + topic, rating + difficulty
- **Filter Memory**: Remembers user's preferred filter settings

#### Visual Rating Display
- **Course Cards**: Prominent star rating with review count
- **Average Rating Calculation**: Weighted algorithm considering recency and user engagement
- **Rating Distribution**: Mini histogram showing rating spread
- **Quality Badges**: "Top Rated", "Community Choice", "Rising Star" for exceptional courses

---

## 🎨 User Experience Design

### Design Principles

#### 1. **Invisible Until Needed**
- Ratings appear contextually, never interrupt learning flow
- Blend seamlessly with existing UI components
- Minimal visual weight until user shows rating intent

#### 2. **Delightful Micro-Interactions**
- Smooth star-fill animations with easing curves
- Subtle color transitions (gray → gold gradient)
- Satisfying completion states with micro-celebrations

#### 3. **Mobile-First Responsive**
- Touch-optimized hit targets (44px minimum)
- Swipe gestures for quick rating on mobile
- Adaptive layouts for different screen sizes

### Visual Specifications

#### Color Palette
```css
/* Star Rating Colors */
--star-empty: #E5E7EB;
--star-filled: linear-gradient(135deg, #FCD34D, #F59E0B);
--star-hover: #FEF3C7;
--rating-text: #374151;
--rating-secondary: #6B7280;
```

#### Animation Specifications
```css
/* Star Fill Animation */
.star-fill {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
}

.star-hover {
  transform: scale(1.1);
  filter: brightness(1.1);
}
```

### User Flow Wireframes

#### Flow 1: Post-Completion Rating
```
[Course Complete] → [2s Delay] → [Rating Appear] → [User Rates] → [Thank You] → [Next Course]
```

#### Flow 2: Micro-Moment Rating
```
[Correct Answer] → [Success State] → [Subtle Star Icon] → [User Taps] → [Quick Rate] → [Continue]
```

#### Flow 3: Course Discovery
```
[Browse Courses] → [Filter by Rating] → [View Rated Courses] → [Rating Confidence Indicators]
```

---

## 🔧 Technical Implementation

### Database Schema

#### Ratings Table
```sql
CREATE TABLE course_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  course_id UUID REFERENCES courses(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  engagement_score FLOAT, -- Algorithm input: time spent, questions answered, etc.
  rating_context VARCHAR(50), -- 'completion', 'mid_course', 'question_success'
  UNIQUE(user_id, course_id)
);

CREATE INDEX idx_course_ratings_course_id ON course_ratings(course_id);
CREATE INDEX idx_course_ratings_rating ON course_ratings(rating);
```

#### Course Rating Aggregates (Materialized View)
```sql
CREATE MATERIALIZED VIEW course_rating_stats AS
SELECT 
  course_id,
  AVG(rating) as average_rating,
  COUNT(*) as total_ratings,
  COUNT(*) FILTER (WHERE rating = 5) as five_star_count,
  COUNT(*) FILTER (WHERE rating >= 4) as four_plus_star_count,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY rating) as median_rating,
  MAX(created_at) as last_rated_at
FROM course_ratings 
GROUP BY course_id;

-- Refresh materialized view every hour
CREATE OR REPLACE FUNCTION refresh_course_rating_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY course_rating_stats;
END;
$$ LANGUAGE plpgsql;
```

### API Endpoints

#### Rating Submission
```typescript
// POST /api/courses/{courseId}/rating
interface RatingRequest {
  rating: number; // 1-5
  context: 'completion' | 'mid_course' | 'question_success';
  engagementData?: {
    timeSpent: number;
    questionsAnswered: number;
    completionPercentage: number;
  };
}

interface RatingResponse {
  success: boolean;
  rating: {
    id: string;
    rating: number;
    created_at: string;
  };
  courseStats: {
    averageRating: number;
    totalRatings: number;
  };
}
```

#### Course Ratings Retrieval
```typescript
// GET /api/courses/{courseId}/ratings
interface CourseRatingsResponse {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    1: number; 2: number; 3: number; 4: number; 5: number;
  };
  userRating?: number; // If user is authenticated and has rated
}
```

#### Filtered Course Discovery
```typescript
// GET /api/courses?minRating=4&sortBy=rating
interface FilteredCoursesRequest {
  minRating?: number; // 1-5
  maxRating?: number; // 1-5
  sortBy?: 'rating' | 'popularity' | 'recent';
  limit?: number;
  offset?: number;
}
```

### Frontend Implementation

#### React Rating Component
```tsx
interface StarRatingProps {
  value?: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'small' | 'medium' | 'large';
  showValue?: boolean;
  animated?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({
  value = 0,
  onChange,
  readonly = false,
  size = 'medium',
  showValue = true,
  animated = true
}) => {
  const [hoverValue, setHoverValue] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRate = async (rating: number) => {
    if (readonly || !onChange) return;
    
    setIsSubmitting(true);
    try {
      await onChange(rating);
      // Show micro-celebration animation
      showSuccessAnimation();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`star-rating star-rating--${size}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          className={cn(
            'star-button',
            star <= (hoverValue || value) && 'star-button--filled',
            animated && 'star-button--animated'
          )}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
          onClick={() => handleRate(star)}
          disabled={readonly || isSubmitting}
          aria-label={`Rate ${star} stars`}
        >
          <StarIcon />
        </button>
      ))}
      {showValue && (
        <span className="rating-value">
          {value > 0 && `${value.toFixed(1)} stars`}
        </span>
      )}
    </div>
  );
};
```

#### Smart Rating Trigger Service
```typescript
class RatingTriggerService {
  private engagementScore = 0;
  private hasRated = false;
  private courseId: string;

  constructor(courseId: string) {
    this.courseId = courseId;
    this.initializeEngagementTracking();
  }

  // Track user engagement signals
  trackEngagement(event: EngagementEvent) {
    switch (event.type) {
      case 'correct_answer':
        this.engagementScore += 10;
        this.checkMicroRatingTrigger();
        break;
      case 'video_pause':
        if (event.duration > 10000) { // 10+ seconds
          this.checkPauseRatingTrigger();
        }
        break;
      case 'course_completion':
        this.triggerCompletionRating();
        break;
    }
  }

  private checkMicroRatingTrigger() {
    if (this.engagementScore >= 30 && !this.hasRated) {
      this.showMicroRatingPrompt();
    }
  }

  private async showMicroRatingPrompt() {
    const ratingModal = new RatingModal({
      type: 'micro',
      position: 'floating',
      autoHide: 8000,
      context: 'question_success'
    });
    
    const rating = await ratingModal.show();
    if (rating) {
      await this.submitRating(rating, 'mid_course');
      this.hasRated = true;
    }
  }
}
```

---

## 📊 Success Metrics

### Primary KPIs
1. **Rating Participation Rate**: % of course completions that result in ratings
2. **Rating Quality Score**: Average rating across all courses
3. **Filter Usage Rate**: % of users who use rating filters
4. **Course Selection Accuracy**: Correlation between rating and user satisfaction

### Secondary Metrics
1. **Time to Rate**: Average seconds from prompt to rating submission
2. **Rating Distribution**: Spread of ratings (avoid rating inflation)
3. **Mobile vs Desktop Rating Rates**: Platform-specific engagement
4. **Creator Engagement**: Response rate to rating feedback

### Analytics Implementation
```typescript
// Track rating events
analytics.track('Course Rated', {
  courseId: string,
  rating: number,
  context: 'completion' | 'mid_course' | 'question_success',
  timeToRate: number, // milliseconds
  platform: 'mobile' | 'desktop',
  engagementScore: number
});

// Track filter usage
analytics.track('Rating Filter Applied', {
  minRating: number,
  filterCombination: string[],
  resultsCount: number,
  sessionId: string
});
```

---

## 🚀 Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Database schema design and migration
- [ ] Basic star rating component with animations
- [ ] Course completion rating trigger
- [ ] Rating storage and retrieval APIs

### Phase 2: Smart Triggers (Weeks 3-4)
- [ ] Engagement tracking system
- [ ] Micro-moment rating prompts
- [ ] Mobile-optimized rating interface
- [ ] Rating submission analytics

### Phase 3: Discovery & Filtering (Weeks 5-6)
- [ ] Course filtering by rating
- [ ] Rating display on course cards
- [ ] Aggregated rating calculations
- [ ] Performance optimization for rating queries

### Phase 4: Polish & Enhancement (Weeks 7-8)
- [ ] Advanced filtering combinations
- [ ] Rating distribution visualizations
- [ ] A/B testing framework for rating prompts
- [ ] Creator rating dashboard
- [ ] Mobile app integration

---

## 🔒 Security & Privacy Considerations

### Data Protection
- **Anonymous Ratings**: Option for users to rate without public attribution
- **Rate Limiting**: Prevent spam ratings (1 rating per course per user)
- **Data Retention**: Rating data retention policy (7 years max)
- **GDPR Compliance**: Right to delete ratings upon account deletion

### Anti-Gaming Measures
- **Engagement Validation**: Require minimum engagement before rating eligibility
- **Bot Detection**: Rate limiting and behavioral analysis
- **Creator Self-Rating Prevention**: Block course creators from rating their own content
- **Suspicious Pattern Detection**: Flag unusual rating patterns for review

---

## 🎯 Success Definition

### Launch Success Criteria
- **Technical**: <2s rating interface load time, 99.9% API uptime
- **User Experience**: >70% rating completion rate, <5% UI abandonment
- **Quality**: >4.0 average platform rating, balanced rating distribution

### Long-term Success Vision
- **User Behavior**: Ratings become natural part of learning journey
- **Platform Quality**: Consistent improvement in course quality through feedback loop
- **Creator Incentive**: High ratings drive creator engagement and platform growth
- **Discovery Excellence**: Users confidently find high-quality courses through rating-based discovery

---

## 📝 Appendix

### Competitive Analysis
- **Udemy**: Prominent star ratings, detailed reviews, strong filtering
- **Coursera**: Course ratings with peer feedback, institutional credibility
- **YouTube**: Like/dislike system, view-based popularity
- **Netflix**: Personalized rating predictions, thumbs up/down simplicity

### Technical Alternatives Considered
1. **Like/Dislike vs 5-Star**: 5-star provides more granular feedback
2. **Real-time vs Batch Updates**: Real-time for better UX, batch for performance
3. **Client vs Server-side Filtering**: Hybrid approach for optimal performance

### Future Enhancements
- **Personalized Rating Predictions**: ML-based course recommendations
- **Review Text Analysis**: Sentiment analysis of written reviews
- **Social Rating Features**: See ratings from followed users
- **Rating-Based Gamification**: Badges for helpful ratings, community recognition

---

*This PRD serves as the comprehensive blueprint for implementing CourseBuild's course rating system. It prioritizes user experience while ensuring technical feasibility and business value alignment.*