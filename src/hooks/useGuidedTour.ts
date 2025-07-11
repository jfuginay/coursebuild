import { useEffect } from 'react';
import { driver, DriveStep, Config } from 'driver.js';
import 'driver.js/dist/driver.css';

// Define tour types
export type TourType = 'newcomer' | 'learner';

interface UseGuidedTourOptions {
  onComplete?: () => void;
  delay?: number; // Delay before starting the tour
}

export const useGuidedTour = (
  tourType: TourType,
  steps: DriveStep[],
  shouldRun: boolean,
  options?: UseGuidedTourOptions
) => {
  useEffect(() => {
    if (!shouldRun || steps.length === 0) return;

    let driverInstance: any = null;

    const startTour = () => {
      // Create a fresh driver instance
      driverInstance = driver({
        showProgress: true,
        steps: steps,
        animate: true,
        smoothScroll: true,
        overlayColor: 'rgba(0, 0, 0, 0.25)',
        stagePadding: 8,
        stageRadius: 8,
        popoverClass: 'courseforge-tour-popover',
        progressText: '{{current}} of {{total}}',
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        doneBtnText: 'Done',
        showButtons: ['next', 'previous', 'close'],
        allowClose: true,
        disableActiveInteraction: true,
        onDestroyStarted: () => {
          // Mark the tour as completed so it doesn't run again
          if (typeof window !== 'undefined') {
            localStorage.setItem(`tourCompleted_${tourType}`, 'true');
            localStorage.setItem(`tourCompletedDate_${tourType}`, new Date().toISOString());
          }
          options?.onComplete?.();
          driverInstance.destroy();
        },
        onCloseClick: () => {
          // Also mark as completed if user closes the tour
          if (typeof window !== 'undefined') {
            localStorage.setItem(`tourCompleted_${tourType}`, 'true');
            localStorage.setItem(`tourCompletedDate_${tourType}`, new Date().toISOString());
          }
          options?.onComplete?.();
          driverInstance.destroy();
        },
      });

      driverInstance.drive();
    };

    // Start tour after a delay if specified
    const timeoutId = setTimeout(startTour, options?.delay || 500);

    return () => {
      clearTimeout(timeoutId);
      // Clean up any existing driver instance
      if (driverInstance) {
        driverInstance.destroy();
      }
    };
  }, [shouldRun, steps, tourType, options]);
};

// Helper function to check if a tour has been completed
export const hasTourBeenCompleted = (tourType: TourType): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`tourCompleted_${tourType}`) === 'true';
};

// Helper function to reset a tour (useful for testing)
export const resetTour = (tourType: TourType): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`tourCompleted_${tourType}`);
  localStorage.removeItem(`tourCompletedDate_${tourType}`);
};