import { AppLanguage } from '../types';
import { fr } from './locales/fr';
import { en } from './locales/en';
import { es } from './locales/es';
import { de } from './locales/de';
import { pt } from './locales/pt';

export interface Translations {
  [key: string]: any;
}

export const translations: Record<AppLanguage, Translations> = {
  fr,
  en,
  es,
  de,
  pt,
};
