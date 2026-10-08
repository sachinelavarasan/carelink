/** "Why Homoeopathy" points, used on the home page and /why-homoeopathy. */
export type WhyIcon = 'leaf' | 'feather' | 'user' | 'hourglass' | 'shield' | 'family';

export interface WhyPoint {
  title: string;
  icon: WhyIcon;
  summary: string;
  detail: string;
}

export const whyHomoeopathy: WhyPoint[] = [
  {
    title: 'Natural',
    icon: 'leaf',
    summary: 'Remedies are prepared from natural sources such as plants and minerals.',
    detail:
      'Homoeopathic medicines are prepared from natural substances, including plants and minerals, through a standardised process of dilution. They are dispensed in small doses, usually as pills or liquid.',
  },
  {
    title: 'Gentle',
    icon: 'feather',
    summary: 'Small, carefully chosen doses that are easy to take, including for children.',
    detail:
      'Remedies are given in small doses and are generally easy to take, which many families appreciate for children and older relatives. As with any treatment, tell the doctor about allergies, pregnancy and other medicines you take.',
  },
  {
    title: 'Individualised Treatment',
    icon: 'user',
    summary: 'Your remedy is chosen for you as a whole person, not just for a diagnosis.',
    detail:
      'Two people with the same diagnosis may receive different remedies. The doctor considers your symptoms together with your temperament, lifestyle, sleep, appetite and history before choosing a treatment.',
  },
  {
    title: 'Long-lasting Care',
    icon: 'hourglass',
    summary: 'A follow-up relationship focused on your health over time.',
    detail:
      'Homoeopathic care is usually an ongoing process. Regular follow-ups let the doctor track your progress, adjust the remedy as needed and look at your overall wellbeing, not only the current complaint.',
  },
  {
    title: 'Supports Immunity',
    icon: 'shield',
    summary: 'Attention to general health, diet and routine as well as symptoms.',
    detail:
      'Alongside remedies, consultations cover practical habits such as diet, sleep, activity and stress that play a part in general health and resilience, particularly for people prone to frequent infections.',
  },
  {
    title: 'For All Age Groups',
    icon: 'family',
    summary: 'Care for infants, children, adults and older people.',
    detail:
      'We see patients of every age, from infants to grandparents. Consultations are adapted to each stage of life, and parents are closely involved in their children’s care.',
  },
];
