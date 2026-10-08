import type { Category } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Продукты', type: 'expense', color: '#2FA36B', icon: 'basket-outline' },
  { id: 'home', name: 'Жильё', type: 'expense', color: '#3B7DD8', icon: 'home-outline' },
  { id: 'transport', name: 'Транспорт', type: 'expense', color: '#1FA2B5', icon: 'bus-outline' },
  { id: 'cafe', name: 'Кафе', type: 'expense', color: '#E8833A', icon: 'cafe-outline' },
  { id: 'fun', name: 'Развлечения', type: 'expense', color: '#8B6CD8', icon: 'film-outline' },
  { id: 'health', name: 'Здоровье', type: 'expense', color: '#D45D9A', icon: 'medkit-outline' },
  { id: 'subs', name: 'Подписки', type: 'expense', color: '#C99A12', icon: 'repeat-outline' },
  { id: 'clothes', name: 'Одежда', type: 'expense', color: '#7A818C', icon: 'shirt-outline' },
  { id: 'other', name: 'Другое', type: 'expense', color: '#9AA0A8', icon: 'ellipsis-horizontal' },

  { id: 'salary', name: 'Зарплата', type: 'income', color: '#1E9E5A', icon: 'briefcase-outline' },
  { id: 'freelance', name: 'Фриланс', type: 'income', color: '#22A39A', icon: 'laptop-outline' },
  { id: 'cashback', name: 'Кешбэк', type: 'income', color: '#4C9F38', icon: 'card-outline' },
  { id: 'gift', name: 'Подарки', type: 'income', color: '#C08A1E', icon: 'gift-outline' },
  { id: 'other-income', name: 'Другое', type: 'income', color: '#9AA0A8', icon: 'ellipsis-horizontal' },
];
