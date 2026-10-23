export type Campaign = {
  id: string;
  place: string;
  city: 'El Alto' | 'La Paz';
  year: number;
  label: string;
  total: number;
  dogs: number;
  cats: number;
  males: number;
  females: number;
  photos: string[];
};

export type SpeciesStats = {
  total: number;
  males: number;
  females: number;
};

export type Stats = {
  caninos: SpeciesStats;
  felinos: SpeciesStats;
};

export type Story = {
  id: string;
  name: string;
  status: 'adopted' | 'recovering';
  text: string;
  photo?: string;
};
