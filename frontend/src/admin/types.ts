export type Sex = 'male' | 'female';
export type Species = 'dog' | 'cat';

export interface Animal {
  id: string;
  name: string;
  species: Species;
  sex: Sex;
  ageMonths: number | null;
  adopted: boolean;
  adopterName: string | null;
  adoptionDate: string | null;
  intakeDate: string | null;
  notes: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export type City = 'El Alto' | 'La Paz';

export interface AdminCampaign {
  id: string;
  place: string;
  city: City;
  startDate: string;
  endDate: string | null;
  total: number;
  dogs: number;
  cats: number;
  males: number;
  females: number;
  photos: Array<{ id: string; url: string }>;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
