import { Cat } from '../CatCard';

export type TabType = 'profile' | 'medical' | 'events' | 'cost' | 'connected';

export interface BaseTabProps {
  cat: Cat;
}
