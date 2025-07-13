# Canvas LMS Export Plan for CourseBuild

## 🎯 Project Overview

This document outlines the comprehensive plan to add Canvas LMS export functionality to CourseBuild, enabling educators to seamlessly transfer AI-generated courses from CourseBuild to their Canvas LMS instances.

## 📋 Current CourseBuild Data Structure Analysis

### Course Data Model
```typescript
interface Course {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  created_at: string;
  published: boolean;
  averageRating?: number;
  totalRatings?: number;
  topic?: string;
}

interface Question {
  id: string;
  question: string;
  type: string; // 'multiple-choice', 'true-false', 'hotspot', 'matching', 'sequencing'
  options: string[];
  correct_answer: number;
  explanation: string;
  timestamp: number;
  visual_context?: string;
  frame_timestamp?: number;
  bounding_boxes?: any[];
  matching_pairs?: any[];
  requires_video_overlay?: boolean;
}

interface Segment {
  title: string;
  timestamp: string;
  timestampSeconds: number;
  concepts: string[];
  questions: Question[];
}
```

### Database Tables
- `courses` - Main course metadata
- `questions` - Quiz questions with visual assets
- `visual_assets` - Frame captures and thumbnails
- `bounding_boxes` - Hotspot question coordinates
- `video_transcripts` - Full video transcriptions
- `course_segments` - Video segmentation data
- `user_course_enrollments` - Student progress tracking

## 🔗 Canvas LMS Integration Architecture

### 1. Canvas API Integration
```typescript
interface CanvasConfig {
  canvasUrl: string;        // e.g., "https://institution.instructure.com"
  accessToken: string;      // Canvas API token
  accountId?: string;       // Canvas account ID (optional)
}

interface CanvasExportOptions {
  courseId?: string;        // Target Canvas course ID (if updating existing)
  createNewCourse: boolean; // Whether to create new course
  includeVideos: boolean;   // Whether to embed YouTube videos
  includeQuizzes: boolean;  // Whether to export quizzes
  moduleStructure: 'segments' | 'linear' | 'custom'; // How to organize content
  publishImmediately: boolean; // Auto-publish or leave as draft
}
```

### 2. Data Transformation Pipeline

#### Course Structure Mapping
```
CourseBuild Course → Canvas Course
├── Course Metadata → Course Settings
├── Video Content → External Tool/Page
├── Segments → Modules
└── Questions → Quizzes/Assignments
```

#### Question Type Mapping
```typescript
const QUESTION_TYPE_MAPPING = {
  'multiple-choice': 'multiple_choice_question',
  'true-false': 'true_false_question',
  'hotspot': 'essay_question', // With custom instructions
  'matching': 'matching_question',
  'sequencing': 'essay_question' // With custom instructions
};
```

## 🚀 Implementation Plan

### Phase 1: Core Canvas Integration (Week 1-2)

#### 1.1 Canvas API Service
```typescript
// src/lib/canvas-api.ts
export class CanvasAPI {
  constructor(private config: CanvasConfig) {}
  
  async createCourse(courseData: CanvasCourseData): Promise<CanvasCourse>;
  async createModule(courseId: string, moduleData: CanvasModuleData): Promise<CanvasModule>;
  async createQuiz(courseId: string, quizData: CanvasQuizData): Promise<CanvasQuiz>;
  async createPage(courseId: string, pageData: CanvasPageData): Promise<CanvasPage>;
  async uploadFile(courseId: string, file: File): Promise<CanvasFile>;
  async publishCourse(courseId: string): Promise<void>;
}
```

#### 1.2 Data Transformation Service
```typescript
// src/lib/canvas-transformer.ts
export class CanvasTransformer {
  static transformCourse(course: Course, segments: Segment[]): CanvasCourseData;
  static transformSegmentToModule(segment: Segment): CanvasModuleData;
  static transformQuestionsToQuiz(questions: Question[]): CanvasQuizData;
  static transformVideoToPage(videoUrl: string, transcript?: string): CanvasPageData;
}
```

#### 1.3 Canvas Authentication
```typescript
// src/components/CanvasAuthSetup.tsx
export function CanvasAuthSetup() {
  // Canvas URL input
  // API token input with validation
  // Connection testing
  // Account/course selection
}
```

### Phase 2: Export Functionality (Week 2-3)

#### 2.1 Export Configuration UI
```typescript
// src/components/CanvasExportDialog.tsx
export function CanvasExportDialog({ course }: { course: Course }) {
  // Export options selection
  // Canvas instance selection
  // Module structure configuration
  // Content inclusion toggles
  // Export progress tracking
}
```

#### 2.2 Export Orchestration
```typescript
// src/lib/canvas-export.ts
export class CanvasExporter {
  async exportCourse(
    course: Course,
    options: CanvasExportOptions
  ): Promise<CanvasExportResult> {
    // 1. Validate Canvas connection
    // 2. Create/update Canvas course
    // 3. Create module structure
    // 4. Export video content
    // 5. Export quizzes
    // 6. Set up progress tracking
    // 7. Publish if requested
  }
}
```

#### 2.3 Progress Tracking
```typescript
interface ExportProgress {
  id: string;
  courseId: string;
  canvasCourseId?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Phase 3: Advanced Features (Week 3-4)

#### 3.1 Video Integration Strategies
```typescript
interface VideoIntegrationOption {
  type: 'embed' | 'external_tool' | 'file_upload' | 'link';
  description: string;
  supportedFeatures: string[];
}

const VIDEO_INTEGRATION_OPTIONS: VideoIntegrationOption[] = [
  {
    type: 'embed',
    description: 'Embed YouTube video directly in Canvas pages',
    supportedFeatures: ['timestamps', 'video_overlay_questions']
  },
  {
    type: 'external_tool',
    description: 'Use Canvas External Tool for interactive video',
    supportedFeatures: ['timestamps', 'questions', 'progress_tracking']
  }
];
```

#### 3.2 Quiz Enhancement
```typescript
// Enhanced quiz export with visual elements
export class CanvasQuizEnhancer {
  static async exportHotspotQuestion(
    question: Question,
    visualAsset: VisualAsset
  ): Promise<CanvasQuestionData> {
    // Convert hotspot to Canvas essay question with image
    // Include detailed instructions
    // Embed image with bounding box overlays
  }
  
  static async exportMatchingQuestion(
    question: Question
  ): Promise<CanvasQuestionData> {
    // Convert matching pairs to Canvas matching question
  }
}
```

## 🔧 Technical Implementation Details

### 1. Canvas API Endpoints

#### Course Creation
```http
POST /api/v1/accounts/{account_id}/courses
Content-Type: application/json

{
  "course": {
    "name": "Course Title",
    "course_code": "COURSE-001",
    "description": "Course description",
    "is_public": false,
    "workflow_state": "unpublished"
  }
}
```

#### Module Creation
```http
POST /api/v1/courses/{course_id}/modules
Content-Type: application/json

{
  "module": {
    "name": "Module Name",
    "position": 1,
    "workflow_state": "active"
  }
}
```

#### Quiz Creation
```http
POST /api/v1/courses/{course_id}/quizzes
Content-Type: application/json

{
  "quiz": {
    "title": "Quiz Title",
    "quiz_type": "assignment",
    "points_possible": 10,
    "published": false
  }
}
```

### 2. Database Schema Extensions

```sql
-- Canvas export tracking
CREATE TABLE canvas_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  canvas_url TEXT NOT NULL,
  canvas_course_id TEXT,
  export_options JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  progress_data JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Canvas API configurations
CREATE TABLE canvas_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  canvas_url TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  account_id TEXT,
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Security Considerations

#### API Token Encryption
```typescript
// src/lib/encryption.ts
export class EncryptionService {
  static encrypt(data: string): string;
  static decrypt(encryptedData: string): string;
}

// Store Canvas tokens encrypted
const encryptedToken = EncryptionService.encrypt(apiToken);
await supabase
  .from('canvas_configurations')
  .insert({ 
    user_id: userId, 
    access_token_encrypted: encryptedToken 
  });
```

#### Rate Limiting
```typescript
// src/lib/rate-limiter.ts
export class CanvasRateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  async canMakeRequest(canvasUrl: string): Promise<boolean> {
    // Canvas API: 3000 requests per hour per token
    // Implement sliding window rate limiting
  }
}
```

## 📊 Canvas Export UI/UX Design

### 1. Export Button Integration
```typescript
// Add to course detail page
<Button 
  onClick={() => setShowCanvasExport(true)}
  className="w-full"
  variant="outline"
>
  <ExternalLink className="w-4 h-4 mr-2" />
  Export to Canvas LMS
</Button>
```

### 2. Export Configuration Modal
```typescript
interface ExportConfigStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
}

const EXPORT_STEPS: ExportConfigStep[] = [
  {
    id: 'canvas-setup',
    title: 'Canvas Connection',
    description: 'Connect to your Canvas LMS instance',
    component: CanvasSetupStep
  },
  {
    id: 'export-options',
    title: 'Export Options',
    description: 'Configure what content to export',
    component: ExportOptionsStep
  },
  {
    id: 'course-structure',
    title: 'Course Structure',
    description: 'Choose how to organize content in Canvas',
    component: CourseStructureStep
  },
  {
    id: 'review-export',
    title: 'Review & Export',
    description: 'Review settings and start export',
    component: ReviewExportStep
  }
];
```

### 3. Real-time Export Progress
```typescript
// src/components/ExportProgressTracker.tsx
export function ExportProgressTracker({ exportId }: { exportId: string }) {
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  
  useEffect(() => {
    // Real-time subscription to export progress
    const subscription = supabase
      .channel('export_progress')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'canvas_exports' },
        (payload) => setProgress(payload.new as ExportProgress)
      )
      .subscribe();
      
    return () => subscription.unsubscribe();
  }, [exportId]);
  
  return (
    <div className="space-y-4">
      <Progress value={(progress?.completedSteps / progress?.totalSteps) * 100} />
      <p className="text-sm text-muted-foreground">{progress?.currentStep}</p>
    </div>
  );
}
```

## 🧪 Testing Strategy

### 1. Canvas API Testing
```typescript
// test/canvas-api.test.ts
describe('Canvas API Integration', () => {
  test('should create course successfully', async () => {
    const canvasAPI = new CanvasAPI(testConfig);
    const course = await canvasAPI.createCourse(mockCourseData);
    expect(course.id).toBeDefined();
  });
  
  test('should handle API rate limiting', async () => {
    // Test rate limiting behavior
  });
  
  test('should validate API tokens', async () => {
    // Test token validation
  });
});
```

### 2. Data Transformation Testing
```typescript
// test/canvas-transformer.test.ts
describe('Canvas Data Transformation', () => {
  test('should transform CourseBuild course to Canvas format', () => {
    const canvasCourse = CanvasTransformer.transformCourse(mockCourse, mockSegments);
    expect(canvasCourse.name).toBe(mockCourse.title);
  });
  
  test('should handle different question types', () => {
    const quizData = CanvasTransformer.transformQuestionsToQuiz(mockQuestions);
    expect(quizData.questions).toHaveLength(mockQuestions.length);
  });
});
```

### 3. End-to-End Testing
```typescript
// test/canvas-export.e2e.ts
describe('Canvas Export E2E', () => {
  test('should complete full export workflow', async () => {
    // 1. Setup Canvas sandbox
    // 2. Export course from CourseBuild
    // 3. Verify Canvas course creation
    // 4. Verify content structure
    // 5. Verify quiz functionality
  });
});
```

## 📈 Analytics and Monitoring

### 1. Export Metrics
```typescript
interface ExportMetrics {
  totalExports: number;
  successfulExports: number;
  failedExports: number;
  averageExportTime: number;
  popularFeatures: string[];
  canvasVersionDistribution: Record<string, number>;
}
```

### 2. Error Tracking
```typescript
// src/lib/export-analytics.ts
export class ExportAnalytics {
  static trackExportStart(courseId: string, options: CanvasExportOptions): void;
  static trackExportSuccess(exportId: string, duration: number): void;
  static trackExportError(exportId: string, error: Error, step: string): void;
  static trackFeatureUsage(feature: string, courseId: string): void;
}
```

## 🚀 Deployment and Rollout

### Phase 1: Beta Testing (Week 4-5)
- Internal testing with CourseBuild team
- Canvas sandbox environment testing
- User acceptance testing with selected educators

### Phase 2: Limited Release (Week 5-6)
- Gradual rollout to premium users
- Feature flagging for controlled access
- Monitor error rates and user feedback

### Phase 3: Full Release (Week 6-7)
- Public availability
- Documentation and tutorials
- Support resources

## 📚 Documentation Requirements

### 1. User Documentation
- Canvas LMS Setup Guide
- Export Options Reference
- Troubleshooting Common Issues
- Canvas Integration Best Practices

### 2. Technical Documentation
- Canvas API Integration Guide
- Data Transformation Specifications
- Security Implementation Details
- Testing Procedures

### 3. Video Tutorials
- "Setting up Canvas Integration"
- "Exporting Your First Course"
- "Advanced Export Options"
- "Troubleshooting Canvas Exports"

## 🔮 Future Enhancements

### 1. Bidirectional Sync
- Import Canvas courses into CourseBuild
- Sync progress data between systems
- Real-time collaboration features

### 2. Advanced Canvas Features
- Canvas Commons integration
- Blueprint course support
- Outcome alignment
- Rubric integration

### 3. Multi-LMS Support
- Moodle integration
- Blackboard integration
- Google Classroom integration
- Generic LTI support

## 💡 Success Metrics

### Key Performance Indicators
- **Export Success Rate**: >95% successful exports
- **Export Speed**: <5 minutes for typical course
- **User Adoption**: 30% of active users try Canvas export
- **User Satisfaction**: >4.5/5 rating for export feature

### Monitoring Dashboards
- Real-time export status
- Canvas API health checks
- User feedback tracking
- Performance metrics

---

**Next Steps:**
1. Review and approve this plan
2. Set up Canvas sandbox environment for testing
3. Begin Phase 1 implementation
4. Create detailed user stories and sprint planning

This comprehensive plan provides a roadmap for implementing Canvas LMS export functionality that will significantly enhance CourseBuild's value proposition for educators using Canvas.