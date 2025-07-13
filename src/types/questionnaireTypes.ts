// Question types
export type QuestionType = 'number' | 'radio' | 'checkbox' | 'boolean' | 'grouped_column_select' | 'progress_indicator' | 'notification_permission' | 'referral_code' | 'plan_generation';

export interface ImageURIs {
  frontImageUri: string;
  leftImageUri: string;
  rightImageUri: string;
}

// Question interface
export interface QuestionItem {
  id: string;
  question: string;
  type: QuestionType;
  options?: string[];
  note?: string;
  hasOther?: boolean;
  hasDetails?: boolean;
  detailsPrompt?: string;
  subQuestions?: Array<{
    id: string;
    label?: string;
    options: string[];
    note?: string;
  }>;
}

// Define all the questions
export const QUESTIONNAIRE_ITEMS: QuestionItem[] = [
  {
    id: 'referral_source',
    question: 'Where did you hear about us?',
    type: 'radio',
    options: ['TikTok', 'Instagram', 'Youtube', 'Google', 'Facebook', 'Friends or family', 'Other'],
  },
  {
    id: 'tried_other_apps',
    question: 'Have you tried other skincare apps?',
    type: 'boolean',
  },
  {
    id: 'age',
    question: 'When were you born?',
    type: 'number',
    note: 'You must be at least 13 years old to use this app.',
  },
  {
    id: 'skin_type',
    question: 'Which best describes your skin type?',
    type: 'radio',
    options: ['Oily', 'Dry', 'Combination', 'Normal', 'Not sure'],
  },
  {
    id: 'skin_sensitivity',
    question: 'How sensitive do you consider your skin?',
    type: 'radio',
    options: [
      'Not sensitive at all',
      'Slightly sensitive', 
      'Moderately sensitive',
      'Very sensitive'
    ],
  },
  {
    id: 'skin_concerns',
    question: "What is your primary skin goal at the moment?",
    type: 'radio',
    note: 'Select one',
    options: [
      'Clear breakouts',
      'Anti-aging',
      'Fade dark spots',
      'Smooth texture',
      'Balance oil',
      'Hydrate/glow',
      'Calm redness',
      'Explore skincare',
    ],
  },
  {
    id: 'motivation_boost',
    question: "Skinsight creates results.",
    type: 'progress_indicator',
    note: "A personalized plan is 90 seconds away",
  },
  {
    id: 'issue_duration_actual',
    question: 'How long have you been experiencing these skin issues?',
    type: 'radio',
    options: ['Less than 3 months', '3-12 months', 'More than 1 year', 'Not sure'],
  },
  {
    id: 'flareup_frequency_actual',
    question: 'How often do these skin issues show up?',
    type: 'radio',
    options: ['Rarely', 'Occasionally', 'Frequently', 'Constantly'],
  },
  /* Temporarily commented out due to animation bugs
  {
    id: 'primary_cause_factor',
    question: 'Which factor do you believe is the primary cause of your skin issues?',
    type: 'radio',
    options: [
      'Poor diet',
      'Poor sleep',
      'Lack of exercise',
      'Stress',
      'Sun exposure',
      'Hormonal changes',
      'Not sure'
    ],
  },
  */
  {
    id: 'skincare_products',
    question: 'What types of products do you use?',
    type: 'checkbox',
    note: 'Select all that apply',
    options: [
      'None',
      'Cleanser',
      'Toner',
      'Serum',
      'Moisturizer',
      'Sunscreen',
      'Exfoliant',
      'Spot treatment',
      'Other',
    ],
  },
  {
    id: 'privacy_shield',
    question: 'Your data is secure and encrypted.',
    type: 'progress_indicator',
    note: 'We take your privacy seriously. The next questions help us personalize your skin routine.',
  },
  {
    id: 'restful_sleep_frequency',
    question: 'How many nights a week do you get restful sleep? (7-8 hours)',
    type: 'radio',
    options: [
      '5-7',
      '3-4',
      '1-2',
      'Rarely/Never'
    ],
  },
  {
    id: 'main_daily_exposure',
    question: 'Select your main daily exposure:',
    type: 'radio',
    options: [
      'Indoors (A/C, heat)',
      'City/Pollution',
      'Outdoors/Sun',
      'Mixed'
    ],
  },
  {
    id: 'post_cleanse_skin_feel',
    question: 'Post-cleanse, your bare skin feels:',
    type: 'radio',
    options: [
      'Oily',
      'Tight/Dry',
      'Normal',
      'Mixed/Combo'
    ],
  },
  {
    id: 'flare_skin_feel',
    question: 'When issues flare, your skin feels:',
    type: 'radio',
    options: [
      'Rough/Flaky',
      'Bumpy ',
      'Reactive/Sensitive',
      'Very Oily',
      'Other'
    ],
  },
  // New slides based on the user's request
  {
    id: 'personalize_intro',
    question: 'Thank you for trusting us',
    type: 'progress_indicator',
    note: "We'll tailor your routine to avoid potentially sensitive ingredients",
  },
  {
    id: 'notification_permission_intro',
    question: 'Achieve your skin goals with notifications',
    type: 'notification_permission',
    note: 'Get reminders for your skincare routine and relevant updates.',
  },
  {
    id: 'notification_permission',
    question: 'Optimized skin advice using location',
    type: 'notification_permission',
    note: 'Gain accurate recommendations based on local UV index, air quality, and weather data.',
  },
  {
    id: 'referral_code',
    question: 'Do you have a referral code?',
    type: 'referral_code',
    note: 'You can skip this step.',
  },
  {
    id: 'generate_plan',
    question: 'All done',
    type: 'plan_generation',
  },
];
