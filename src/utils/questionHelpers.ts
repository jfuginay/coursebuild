/**
 * Question Data Helpers
 * 
 * Utility functions for handling question data from the database,
 * including proper type conversion and validation.
 */

/**
 * Parses the correct_answer field from the database, handling both
 * string and number formats consistently.
 * 
 * @param correctAnswer - The raw correct_answer value from the database
 * @param questionType - The type of question (for validation)
 * @returns The parsed correct answer as a number
 */
export function parseCorrectAnswer(
  correctAnswer: string | number | boolean,
  questionType: string
): number {
  // If already a number, return it
  if (typeof correctAnswer === 'number') {
    return correctAnswer;
  }

  // Handle boolean values
  if (typeof correctAnswer === 'boolean') {
    // For true/false: true -> 0, false -> 1
    return correctAnswer ? 0 : 1;
  }

  // Handle string values
  if (typeof correctAnswer === 'string') {
    // Try to parse as number first
    const parsed = parseInt(correctAnswer, 10);
    if (!isNaN(parsed)) {
      return parsed;
    }

    // Handle boolean strings for true/false questions
    if (questionType === 'true-false') {
      const lowerAnswer = correctAnswer.toLowerCase();
      if (lowerAnswer === 'true') return 0;
      if (lowerAnswer === 'false') return 1;
    }

    // Handle special question types
    if (['hotspot', 'matching', 'sequencing'].includes(questionType)) {
      return 1;
    }
  }

  // Default fallback
  console.warn(`Unable to parse correct_answer: ${correctAnswer} for type: ${questionType}`);
  return 0;
}

/**
 * Formats the correct answer for display based on question type
 * 
 * @param correctAnswer - The parsed correct answer index
 * @param questionType - The type of question
 * @param options - The options array (for MCQ)
 * @returns The formatted answer text
 */
export function formatCorrectAnswer(
  correctAnswer: number,
  questionType: string,
  options?: any[]
): string {
  switch (questionType) {
    case 'true-false':
      return correctAnswer === 0 ? 'True' : 'False';
    
    case 'multiple-choice':
      if (options && options[correctAnswer]) {
        return options[correctAnswer];
      }
      return `Option ${correctAnswer + 1}`;
    
    case 'hotspot':
    case 'matching':
    case 'sequencing':
      return 'See visual overlay';
    
    default:
      return String(correctAnswer);
  }
}

/**
 * Validates if a user's answer is correct
 * 
 * @param userAnswer - The user's selected answer
 * @param correctAnswer - The correct answer from the database
 * @param questionType - The type of question
 * @returns Whether the answer is correct
 */
export function isAnswerCorrect(
  userAnswer: number | string | boolean,
  correctAnswer: string | number | boolean,
  questionType: string
): boolean {
  const parsedCorrect = parseCorrectAnswer(correctAnswer, questionType);
  
  if (typeof userAnswer === 'number') {
    return userAnswer === parsedCorrect;
  }
  
  if (typeof userAnswer === 'boolean' && questionType === 'true-false') {
    // User answer: true -> 0, false -> 1
    const userIndex = userAnswer ? 0 : 1;
    return userIndex === parsedCorrect;
  }
  
  if (typeof userAnswer === 'string') {
    const parsedUser = parseInt(userAnswer, 10);
    if (!isNaN(parsedUser)) {
      return parsedUser === parsedCorrect;
    }
    
    // Handle string boolean answers
    if (questionType === 'true-false') {
      const lowerAnswer = userAnswer.toLowerCase();
      const userIndex = lowerAnswer === 'true' ? 0 : 1;
      return userIndex === parsedCorrect;
    }
  }
  
  return false;
}

/**
 * Gets the correct option text for a question
 * 
 * @param question - The question object from the database
 * @returns The correct answer text
 */
export function getCorrectOptionText(question: any): string {
  const correctIndex = parseCorrectAnswer(question.correct_answer, question.type);
  
  if (question.type === 'true-false') {
    return correctIndex === 0 ? 'True' : 'False';
  }
  
  if (question.type === 'multiple-choice' && question.options) {
    try {
      const options = typeof question.options === 'string' 
        ? JSON.parse(question.options) 
        : question.options;
      
      if (Array.isArray(options) && options[correctIndex]) {
        return options[correctIndex];
      }
    } catch (e) {
      console.error('Error parsing options:', e);
    }
  }
  
  return formatCorrectAnswer(correctIndex, question.type, question.options);
} 