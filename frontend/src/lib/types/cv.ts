export interface CvData {
  name: string;
  email: string;
  phone: string;
  location: string;
  experience: {
    company: string;
    location: string;
    title: string;
    period: string;
    duration: string;
    bullets: string[];
  }[];
  education: {
    school: string;
    location: string;
    degree: string;
    year: string;
  }[];
  skills: string[];
  summary: string;
}
