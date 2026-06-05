export type CoverLetterContact = {
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  portfolio?: string;
};

export type CoverLetter = {
  candidateName: string;
  contact: CoverLetterContact;
  date: string;
  recipient: string;
  jobTitle: string;
  greeting: string;
  opening: string;
  body: string[];
  closing: string;
};
