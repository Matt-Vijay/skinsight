import { logger } from '@/config/logger';

import { supabase } from '../config/supabase';
import { loadQuestionnaireAnswers } from './questionnaireCache';

// Interface for the questionnaire data to be sent to Supabase
export interface UserQuestionnaireResults {
  user_id: string;
  completed_at?: string;
  gender?: string[];
  skin_type?: string[];
  issue_duration?: string[];
  skincare_products?: string[];
  birthdate?: string;
  issue_frequency?: string[];
  main_acne_trigger?: string[];
  restful_sleeps_per_week?: string[];
  skin_sensitivity?: string[];
  primary_skin_goal?: string[];
  main_daily_exposure?: string[];
  post_cleanse_skin?: string[];
  flared_up_skin_feels?: string[];
  where_heard_about_dewy?: string[];
  tried_other_skincare_apps?: boolean;
  referral_code?: string[];
  notifications_enabled?: boolean;
  location_enabled?: boolean;
}

// Function to map frontend answers to the Supabase table structure
const mapAnswersToSupabaseSchema = (answers: any, userId: string): UserQuestionnaireResults => {
  const birthDateDetails = answers.birthDateDetails;
  let birthdate: string | undefined;
  if (birthDateDetails && birthDateDetails.year && birthDateDetails.month && birthDateDetails.day) {
    // Month from date picker is 0-indexed, and Date constructor also expects 0-indexed month.
    const date = new Date(parseInt(birthDateDetails.year, 10), parseInt(birthDateDetails.month, 10), parseInt(birthDateDetails.day, 10));
    if (!isNaN(date.getTime())) {
      birthdate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    }
  }

  const mappedData: UserQuestionnaireResults = {
    user_id: userId,
    completed_at: new Date().toISOString(),
    gender: answers.gender ? [answers.gender] : undefined,
    skin_type: answers.skin_type ? [answers.skin_type] : undefined,
    issue_duration: answers.issue_duration_actual ? [answers.issue_duration_actual] : undefined,
    skincare_products: answers.skincare_products,
    birthdate: birthdate,
    issue_frequency: answers.flareup_frequency_actual ? [answers.flareup_frequency_actual] : undefined,
    main_acne_trigger: answers.primary_cause_factor ? [answers.primary_cause_factor] : undefined,
    restful_sleeps_per_week: answers.restful_sleep_frequency ? [answers.restful_sleep_frequency] : undefined,
    skin_sensitivity: answers.skin_sensitivity ? [answers.skin_sensitivity] : undefined,
    primary_skin_goal: answers.skin_concerns ? [answers.skin_concerns] : undefined,
    main_daily_exposure: answers.main_daily_exposure ? [answers.main_daily_exposure] : undefined,
    post_cleanse_skin: answers.post_cleanse_skin_feel ? [answers.post_cleanse_skin_feel] : undefined,
    flared_up_skin_feels: answers.flare_skin_feel ? [answers.flare_skin_feel] : undefined,
    where_heard_about_dewy: answers.referral_source ? [answers.referral_source] : undefined,
    tried_other_skincare_apps: answers.tried_other_apps,
    referral_code: answers.referral_code ? [answers.referral_code] : undefined,
    notifications_enabled: answers.notifications_enabled,
    location_enabled: answers.location_enabled,
  };

  // Remove undefined properties
  Object.keys(mappedData).forEach(key => {
    if ((mappedData as any)[key] === undefined) {
      delete (mappedData as any)[key];
    }
  });

  return mappedData;
};

// Function to submit questionnaire data to Supabase
export const submitQuestionnaireData = async (userId: string) => {
  const answers = await loadQuestionnaireAnswers();
  if (!answers) {
    logger.error('No questionnaire answers found in cache. Cannot submit.');
    return;
  }

  const questionnaireData = mapAnswersToSupabaseSchema(answers, userId);

  const { data, error } = await supabase
    .from('user_questionnaire_results')
    .upsert(questionnaireData, { onConflict: 'user_id' });

  if (error) {
    logger.error('Error submitting questionnaire data to Supabase:', error);
    throw error;
  }

  logger.debug('Successfully submitted questionnaire data:', data);
  return data;
}; 