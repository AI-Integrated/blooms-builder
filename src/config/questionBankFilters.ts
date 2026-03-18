// Cascading filter configuration for Question Bank
// Category → Specialization → Subject Code → Subject Description

export interface SubjectEntry {
  code: string;
  description: string;
}

export interface SpecializationEntry {
  name: string;
  subjects: SubjectEntry[];
}

export interface CategoryConfig {
  specializations: SpecializationEntry[];
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  Major: {
    specializations: [
      {
        name: "IT",
        subjects: [
          { code: "101", description: "Introduction to Computing" },
          { code: "102", description: "Computer Programming 1" },
          { code: "103", description: "Computer Programming 2" },
          { code: "104", description: "Data Structures and Algorithms" },
          { code: "105", description: "Discrete Mathematics" },
          { code: "106", description: "Web Development" },
          { code: "107", description: "Database Management Systems" },
          { code: "108", description: "Networking Fundamentals" },
          { code: "109", description: "Systems Administration" },
          { code: "110", description: "Information Assurance and Security" },
        ],
      },
      {
        name: "IS",
        subjects: [
          { code: "101", description: "Fundamentals of Information Systems" },
          { code: "102", description: "Systems Analysis and Design" },
          { code: "103", description: "Business Process Management" },
          { code: "104", description: "Enterprise Architecture" },
          { code: "105", description: "IS Project Management" },
          { code: "106", description: "IT Infrastructure" },
        ],
      },
      {
        name: "CS",
        subjects: [
          { code: "101", description: "Introduction to Computer Science" },
          { code: "102", description: "Object-Oriented Programming" },
          { code: "103", description: "Operating Systems" },
          { code: "104", description: "Theory of Computation" },
          { code: "105", description: "Artificial Intelligence" },
          { code: "106", description: "Software Engineering" },
        ],
      },
      {
        name: "EMC",
        subjects: [
          { code: "101", description: "Entertainment and Multimedia Computing Fundamentals" },
          { code: "102", description: "Digital Media Arts" },
          { code: "103", description: "Game Development" },
          { code: "104", description: "Animation and Motion Graphics" },
        ],
      },
    ],
  },
  GE: {
    specializations: [
      {
        name: "Math",
        subjects: [
          { code: "101", description: "Mathematics in the Modern World" },
          { code: "102", description: "Calculus 1" },
          { code: "103", description: "Calculus 2" },
          { code: "104", description: "Linear Algebra" },
          { code: "105", description: "Statistics and Probability" },
        ],
      },
      {
        name: "P.E.",
        subjects: [
          { code: "101", description: "Physical Fitness and Wellness" },
          { code: "102", description: "Rhythmic Activities" },
          { code: "103", description: "Team Sports" },
          { code: "104", description: "Individual and Dual Sports" },
        ],
      },
      {
        name: "English",
        subjects: [
          { code: "101", description: "Purposive Communication" },
          { code: "102", description: "Readings in Philippine History" },
          { code: "103", description: "Technical Writing" },
          { code: "104", description: "World Literature" },
        ],
      },
      {
        name: "Filipino",
        subjects: [
          { code: "101", description: "Kontekstuwalisadong Komunikasyon sa Filipino" },
          { code: "102", description: "Pagbasa at Pagsulat Tungo sa Pananaliksik" },
          { code: "103", description: "Masining na Pagpapahayag" },
        ],
      },
      {
        name: "Science",
        subjects: [
          { code: "101", description: "Science, Technology, and Society" },
          { code: "102", description: "The Contemporary World" },
        ],
      },
      {
        name: "Social Science",
        subjects: [
          { code: "101", description: "Understanding the Self" },
          { code: "102", description: "Ethics" },
          { code: "103", description: "Life and Works of Rizal" },
        ],
      },
    ],
  },
};

export const CATEGORIES = Object.keys(CATEGORY_CONFIG);

export function getSpecializations(category: string): string[] {
  return CATEGORY_CONFIG[category]?.specializations.map((s) => s.name) || [];
}

export function getSubjectCodes(category: string, specialization: string): SubjectEntry[] {
  const spec = CATEGORY_CONFIG[category]?.specializations.find(
    (s) => s.name === specialization
  );
  return spec?.subjects || [];
}

export function getSubjectDescription(
  category: string,
  specialization: string,
  subjectCode: string
): string {
  const subjects = getSubjectCodes(category, specialization);
  return subjects.find((s) => s.code === subjectCode)?.description || "";
}
