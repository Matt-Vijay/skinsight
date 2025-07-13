import { logger } from '@/config/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ANSWERS_KEY = 'questionnaire_answers';
const PROGRESS_KEY = 'questionnaire_progress';

// Functions for persistent questionnaire caching using AsyncStorage
export const saveQuestionnaireAnswers = async (answers: any) => {
  try {
    const jsonValue = JSON.stringify(answers);
    await AsyncStorage.setItem(ANSWERS_KEY, jsonValue);
  } catch (error) {
    logger.warn('Failed to save questionnaire answers to AsyncStorage:', error);
  }
};

export const loadQuestionnaireAnswers = async (): Promise<any | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(ANSWERS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    logger.warn('Failed to load questionnaire answers from AsyncStorage:', error);
    return null;
  }
};

export const saveQuestionnaireProgress = async (currentQuestion: number) => {
  try {
    await AsyncStorage.setItem(PROGRESS_KEY, String(currentQuestion));
  } catch (error) {
    logger.warn('Failed to save questionnaire progress to AsyncStorage:', error);
  }
};

export const loadQuestionnaireProgress = async (): Promise<{ currentQuestion: number } | null> => {
  try {
    const value = await AsyncStorage.getItem(PROGRESS_KEY);
    if (value !== null) {
      const currentQuestion = parseInt(value, 10);
      if (!isNaN(currentQuestion)) {
        return { currentQuestion };
      }
    }
    return null;
  } catch (error) {
    logger.warn('Failed to load questionnaire progress from AsyncStorage:', error);
    return null;
  }
};

export const clearQuestionnaireCache = async () => {
  try {
    await AsyncStorage.removeItem(ANSWERS_KEY);
    await AsyncStorage.removeItem(PROGRESS_KEY);
  } catch (error) {
    logger.warn('Failed to clear questionnaire cache from AsyncStorage:', error);
  }
}; 