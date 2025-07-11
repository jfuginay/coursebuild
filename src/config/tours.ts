import { DriveStep } from 'driver.js';

// Journey 1: The Curious Newcomer (Not Logged In)
export const newcomerTourSteps: DriveStep[] = [
  {
    element: '#main-headline',
    popover: {
      title: 'Welcome to CourseForge AI! 🚀',
      description: 'Ready to turn any YouTube video into an interactive course? Let\'s get started in just two clicks.',
      position: 'bottom',
      align: 'center',
      offset: 20,
    }
  },
  {
    element: '#youtube-url-input',
    popover: {
      title: 'Start Here',
      description: 'Just paste any educational YouTube URL into this field. The AI works best with structured content like tutorials or lectures.',
      position: 'top',
      align: 'center',
      offset: 20,
    }
  },
  {
    element: '#generate-course-button',
    popover: {
      title: 'Generate Your Course',
      description: 'Click here to let the AI work its magic. Our system will analyze the video, create a transcript, identify key concepts, and generate questions for you.',
      position: 'top',
      align: 'center',
      offset: 20,
    }
  },
  // Note: Steps 4-5 will be handled on the create page
];

// Steps for the creation page (part of newcomer journey)
export const creationPageSteps: DriveStep[] = [
  {
    element: '#progress-tracker',
    popover: {
      title: 'The AI at Work 🧠',
      description: 'Our AI is now building your course! You\'re seeing our real-time pipeline at work, from planning and transcript generation to creating questions. This usually takes about 30 seconds.',
      position: 'right',
      align: 'center',
      offset: 20,
    }
  },
];

// Steps for the course preview page (final part of newcomer journey)
export const previewPageSteps: DriveStep[] = [
  {
    element: '#course-preview-card',
    popover: {
      title: 'Success! Your Course is Ready',
      description: 'Here you can review the AI-generated segments and questions. Click "Preview Course" to start learning!',
      position: 'left',
      align: 'center',
      offset: 20,
    }
  },
];

// Journey 2: The Eager Learner (First-Time Logged In)
export const learnerTourSteps: DriveStep[] = [
  {
    element: '#interactive-video-player',
    popover: {
      title: 'Your Interactive Player',
      description: 'Welcome to your first course! This is more than just a video. As you watch, questions will appear at key moments to test your knowledge.',
      position: 'bottom',
      align: 'center',
      offset: 20,
    }
  },
  {
    element: '#video-progress-bar',
    popover: {
      title: 'Track Your Journey',
      description: 'The dots on this progress bar mark where interactive questions will appear. You can click anywhere on the bar to jump to that part of the lesson.',
      position: 'top',
      align: 'center',
      offset: 20,
    }
  },
  {
    element: '#video-player-area',
    popover: {
      title: 'Ready for a Question?',
      description: 'When a question appears, this card will flip over. After you answer, it will flip back to the video right where you left off.',
      position: 'left',
      align: 'center',
      offset: 20,
    }
  },
  {
    element: '#transcript-display',
    popover: {
      title: 'Follow Along!',
      description: 'A live transcript of the video is displayed here. Click any segment to jump directly to that point in the video.',
      position: 'top',
      align: 'center',
      offset: 20,
    }
  },
  {
    element: '#course-curriculum',
    popover: {
      title: 'Your Course Outline',
      description: 'See all the questions in this course. Green checkmarks show your progress. You can expand any question to review the explanation.',
      position: 'left',
      align: 'center',
      offset: 20,
    }
  },
];

// Additional tour for specific features (can be triggered separately)
export const featureTourSteps: DriveStep[] = [
  {
    element: '#generate-next-course',
    popover: {
      title: 'Continue Learning',
      description: 'Want more? Click here to generate a follow-up course based on the same video or topic.',
      position: 'top',
    }
  },
  {
    element: '#star-rating',
    popover: {
      title: 'Rate Your Experience',
      description: 'Help us improve! Rate this course to let us know how helpful it was.',
      position: 'bottom',
    }
  },
];