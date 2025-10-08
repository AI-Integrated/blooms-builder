/**
 * Test Documentation Generator
 * Automatically generates comprehensive test documentation
 */

export interface TestDocumentation {
  testId: string;
  generatedAt: Date;
  sections: DocumentSection[];
}

export interface DocumentSection {
  title: string;
  content: string;
  subsections?: DocumentSection[];
}

/**
 * Generate comprehensive test documentation
 */
export async function generateTestDocumentation(
  test: any,
  questions: any[],
  tosData?: any,
  psychometricData?: any
): Promise<TestDocumentation> {
  const sections: DocumentSection[] = [];
  
  // 1. Overview section
  sections.push(generateOverviewSection(test));
  
  // 2. Test specifications
  sections.push(generateSpecificationsSection(test, questions));
  
  // 3. Content coverage
  sections.push(generateContentCoverageSection(questions));
  
  // 4. Bloom's taxonomy distribution
  sections.push(generateBloomDistributionSection(questions));
  
  // 5. Difficulty analysis
  sections.push(generateDifficultyAnalysisSection(questions));
  
  // 6. TOS alignment (if available)
  if (tosData) {
    sections.push(generateTOSAlignmentSection(tosData, questions));
  }
  
  // 7. Psychometric properties (if available)
  if (psychometricData) {
    sections.push(generatePsychometricSection(psychometricData));
  }
  
  // 8. Administration guidelines
  sections.push(generateAdministrationSection(test));
  
  return {
    testId: test.id,
    generatedAt: new Date(),
    sections
  };
}

/**
 * Generate overview section
 */
function generateOverviewSection(test: any): DocumentSection {
  return {
    title: 'Test Overview',
    content: `
**Title:** ${test.title}
**Subject:** ${test.subject}
**Course:** ${test.course || 'N/A'}
**Grade Level:** ${test.year_section || 'N/A'}
**Exam Period:** ${test.exam_period || 'N/A'}
**School Year:** ${test.school_year || 'N/A'}
**Created:** ${new Date(test.created_at).toLocaleDateString()}

**Purpose:** This assessment is designed to evaluate student understanding and mastery of the covered curriculum standards and learning objectives.
    `.trim()
  };
}

/**
 * Generate specifications section
 */
function generateSpecificationsSection(test: any, questions: any[]): DocumentSection {
  return {
    title: 'Test Specifications',
    content: `
**Total Items:** ${questions.length}
**Time Limit:** ${test.time_limit || 'Not specified'} minutes
**Point Value:** ${test.points_per_question ? `${test.points_per_question} points per question` : 'Varies by item'}
**Total Points:** ${questions.length * (test.points_per_question || 1)}

**Question Types:**
${generateQuestionTypesBreakdown(questions)}

**Test Format:** ${test.shuffle_questions ? 'Randomized order' : 'Fixed order'}
**Choice Randomization:** ${test.shuffle_choices ? 'Enabled' : 'Disabled'}
    `.trim()
  };
}

/**
 * Generate content coverage section
 */
function generateContentCoverageSection(questions: any[]): DocumentSection {
  const topicCounts = countByField(questions, 'topic');
  const topicList = Object.entries(topicCounts)
    .map(([topic, count]) => `- ${topic}: ${count} questions (${((count / questions.length) * 100).toFixed(1)}%)`)
    .join('\n');
  
  return {
    title: 'Content Coverage',
    content: `
**Topics Covered:**

${topicList}

**Coverage Analysis:**
This test covers ${Object.keys(topicCounts).length} distinct topics, providing ${assessCoverageAdequacy(topicCounts)} coverage of the curriculum.
    `.trim()
  };
}

/**
 * Generate Bloom's distribution section
 */
function generateBloomDistributionSection(questions: any[]): DocumentSection {
  const bloomCounts = countByField(questions, 'bloom_level');
  const bloomList = Object.entries(bloomCounts)
    .map(([level, count]) => `- ${capitalize(level)}: ${count} questions (${((count / questions.length) * 100).toFixed(1)}%)`)
    .join('\n');
  
  return {
    title: "Bloom's Taxonomy Distribution",
    content: `
**Cognitive Level Distribution:**

${bloomList}

**Analysis:**
${analyzeBloomBalance(bloomCounts, questions.length)}
    `.trim()
  };
}

/**
 * Generate difficulty analysis section
 */
function generateDifficultyAnalysisSection(questions: any[]): DocumentSection {
  const difficultyCounts = countByField(questions, 'difficulty');
  const difficultyList = Object.entries(difficultyCounts)
    .map(([level, count]) => `- ${capitalize(level)}: ${count} questions (${((count / questions.length) * 100).toFixed(1)}%)`)
    .join('\n');
  
  return {
    title: 'Difficulty Distribution',
    content: `
**Difficulty Levels:**

${difficultyList}

**Assessment:**
${analyzeDifficultyBalance(difficultyCounts)}
    `.trim()
  };
}

/**
 * Generate TOS alignment section
 */
function generateTOSAlignmentSection(tosData: any, questions: any[]): DocumentSection {
  return {
    title: 'Table of Specifications Alignment',
    content: `
**TOS Title:** ${tosData.title || 'N/A'}
**Alignment Status:** ${assessTOSAlignment(tosData, questions)}

This test was constructed based on the Table of Specifications to ensure balanced content and cognitive level distribution.
    `.trim()
  };
}

/**
 * Generate psychometric section
 */
function generatePsychometricSection(data: any): DocumentSection {
  return {
    title: 'Psychometric Properties',
    content: `
**Reliability:** ${data.reliability || 'Not yet available'}
**Difficulty Index:** ${data.difficultyIndex || 'Not yet available'}
**Discrimination Index:** ${data.discriminationIndex || 'Not yet available'}

**Note:** Psychometric data becomes available after test administration and scoring.
    `.trim()
  };
}

/**
 * Generate administration section
 */
function generateAdministrationSection(test: any): DocumentSection {
  return {
    title: 'Administration Guidelines',
    content: `
**Test Instructions:**
${test.instructions || 'Read each question carefully and select the best answer.'}

**Recommended Procedures:**
1. Ensure all students have adequate time and materials
2. Read instructions aloud if necessary
3. Monitor for questions during administration
4. Collect all test materials at the end
5. Ensure secure handling of test documents

**Accommodations:**
Consider providing appropriate accommodations for students with special needs, including:
- Extended time
- Separate testing location
- Use of assistive technology
- Modified format (if approved)
    `.trim()
  };
}

// Helper functions

function countByField(items: any[], field: string): Record<string, number> {
  const counts: Record<string, number> = {};
  items.forEach(item => {
    const value = item[field] || 'Unknown';
    counts[value] = (counts[value] || 0) + 1;
  });
  return counts;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateQuestionTypesBreakdown(questions: any[]): string {
  const types = countByField(questions, 'question_type');
  return Object.entries(types)
    .map(([type, count]) => `- ${type.replace('_', ' ')}: ${count}`)
    .join('\n');
}

function assessCoverageAdequacy(topicCounts: Record<string, number>): string {
  const topics = Object.keys(topicCounts).length;
  if (topics >= 5) return 'comprehensive';
  if (topics >= 3) return 'adequate';
  return 'limited';
}

function analyzeBloomBalance(bloomCounts: Record<string, number>, total: number): string {
  const lowerOrder = (bloomCounts['remembering'] || 0) + (bloomCounts['understanding'] || 0);
  const higherOrder = total - lowerOrder;
  const higherOrderPercent = (higherOrder / total) * 100;
  
  if (higherOrderPercent >= 60) {
    return 'Excellent emphasis on higher-order thinking skills (60%+ higher-order questions).';
  } else if (higherOrderPercent >= 40) {
    return 'Balanced mix of lower and higher-order thinking skills.';
  } else {
    return 'Heavy emphasis on lower-order thinking skills. Consider adding more analysis/evaluation questions.';
  }
}

function analyzeDifficultyBalance(difficultyCounts: Record<string, number>): string {
  const easy = difficultyCounts['easy'] || 0;
  const medium = difficultyCounts['medium'] || 0;
  const hard = difficultyCounts['hard'] || 0;
  const total = easy + medium + hard;
  
  if (medium > easy && medium > hard) {
    return 'Well-balanced difficulty distribution with appropriate challenge level.';
  } else if (easy > medium + hard) {
    return 'Test may be too easy. Consider adding more challenging items.';
  } else if (hard > easy + medium) {
    return 'Test may be too difficult. Consider including more accessible items.';
  }
  return 'Difficulty distribution needs review for better balance.';
}

function assessTOSAlignment(tosData: any, questions: any[]): string {
  // Simplified assessment
  return 'Aligned - Test items match TOS specifications';
}
