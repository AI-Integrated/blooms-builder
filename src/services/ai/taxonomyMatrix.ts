export interface TaxonomyCell {
  bloomLevel: string;
  knowledgeDimension: string;
  questionCount: number;
  questions: string[];
  averageConfidence: number;
  averageQuality: number;
  coverage: number;
}

export interface TaxonomyMatrix {
  cells: TaxonomyCell[][];
  bloomLevels: string[];
  knowledgeDimensions: string[];
  totalQuestions: number;
  overallCoverage: number;
  gaps: Array<{ bloom: string; knowledge: string; severity: 'high' | 'medium' | 'low' }>;
}

export class TaxonomyMatrixService {
  private static readonly BLOOM_LEVELS = [
    'remembering',
    'understanding', 
    'applying',
    'analyzing',
    'evaluating',
    'creating'
  ];

  private static readonly KNOWLEDGE_DIMENSIONS = [
    'factual',
    'conceptual',
    'procedural',
    'metacognitive'
  ];

  static buildMatrix(questions: any[]): TaxonomyMatrix {
    const cells: TaxonomyCell[][] = [];
    const gaps: Array<{ bloom: string; knowledge: string; severity: 'high' | 'medium' | 'low' }> = [];
    
    // Initialize matrix
    for (let i = 0; i < this.BLOOM_LEVELS.length; i++) {
      const row: TaxonomyCell[] = [];
      
      for (let j = 0; j < this.KNOWLEDGE_DIMENSIONS.length; j++) {
        const bloomLevel = this.BLOOM_LEVELS[i];
        const knowledgeDimension = this.KNOWLEDGE_DIMENSIONS[j];
        
        // Filter questions for this cell
        const cellQuestions = questions.filter(q => 
          q.bloom_level?.toLowerCase() === bloomLevel &&
          q.knowledge_dimension?.toLowerCase() === knowledgeDimension
        );

        const questionCount = cellQuestions.length;
        const averageConfidence = questionCount > 0 
          ? cellQuestions.reduce((sum, q) => sum + (q.classification_confidence || 0), 0) / questionCount
          : 0;
        
        const averageQuality = questionCount > 0
          ? cellQuestions.reduce((sum, q) => sum + (q.quality_score || 0.7), 0) / questionCount
          : 0;

        // Calculate coverage (target: 5 questions per cell)
        const coverage = Math.min(1, questionCount / 5);

        const cell: TaxonomyCell = {
          bloomLevel,
          knowledgeDimension,
          questionCount,
          questions: cellQuestions.map(q => q.id),
          averageConfidence,
          averageQuality,
          coverage
        };

        row.push(cell);

        // Identify gaps
        if (questionCount === 0) {
          gaps.push({ bloom: bloomLevel, knowledge: knowledgeDimension, severity: 'high' });
        } else if (questionCount < 3) {
          gaps.push({ bloom: bloomLevel, knowledge: knowledgeDimension, severity: 'medium' });
        } else if (questionCount < 5) {
          gaps.push({ bloom: bloomLevel, knowledge: knowledgeDimension, severity: 'low' });
        }
      }
      
      cells.push(row);
    }

    const totalQuestions = questions.length;
    const filledCells = cells.flat().filter(cell => cell.questionCount > 0).length;
    const totalCells = this.BLOOM_LEVELS.length * this.KNOWLEDGE_DIMENSIONS.length;
    const overallCoverage = filledCells / totalCells;

    return {
      cells,
      bloomLevels: this.BLOOM_LEVELS,
      knowledgeDimensions: this.KNOWLEDGE_DIMENSIONS,
      totalQuestions,
      overallCoverage,
      gaps
    };
  }

  static getCellPosition(bloomLevel: string, knowledgeDimension: string): { row: number; col: number } | null {
    const row = this.BLOOM_LEVELS.findIndex(level => level.toLowerCase() === bloomLevel.toLowerCase());
    const col = this.KNOWLEDGE_DIMENSIONS.findIndex(dim => dim.toLowerCase() === knowledgeDimension.toLowerCase());
    
    if (row === -1 || col === -1) return null;
    return { row, col };
  }

  static getCell(matrix: TaxonomyMatrix, bloomLevel: string, knowledgeDimension: string): TaxonomyCell | null {
    const position = this.getCellPosition(bloomLevel, knowledgeDimension);
    if (!position) return null;
    
    return matrix.cells[position.row]?.[position.col] || null;
  }

  static analyzeBalance(matrix: TaxonomyMatrix): {
    isBalanced: boolean;
    imbalances: Array<{ type: string; description: string; severity: 'high' | 'medium' | 'low' }>;
    recommendations: string[];
  } {
    const imbalances: Array<{ type: string; description: string; severity: 'high' | 'medium' | 'low' }> = [];
    const recommendations: string[] = [];

    // Check Bloom's level distribution
    const bloomCounts = matrix.bloomLevels.map(bloom => {
      const count = matrix.cells[matrix.bloomLevels.indexOf(bloom)]
        .reduce((sum, cell) => sum + cell.questionCount, 0);
      return { bloom, count };
    });

    const avgBloomCount = bloomCounts.reduce((sum, b) => sum + b.count, 0) / bloomCounts.length;
    
    bloomCounts.forEach(({ bloom, count }) => {
      const deviation = Math.abs(count - avgBloomCount) / avgBloomCount;
      if (deviation > 0.5) {
        imbalances.push({
          type: 'bloom_distribution',
          description: `${bloom} level has ${count} questions (${deviation > 0 ? 'over' : 'under'}represented)`,
          severity: deviation > 0.8 ? 'high' : 'medium'
        });
        
        if (count < avgBloomCount * 0.5) {
          recommendations.push(`Add more ${bloom} level questions`);
        }
      }
    });

    // Check knowledge dimension distribution
    const knowledgeCounts = matrix.knowledgeDimensions.map(knowledge => {
      const count = matrix.cells.reduce((sum, row) => {
        const colIndex = matrix.knowledgeDimensions.indexOf(knowledge);
        return sum + (row[colIndex]?.questionCount || 0);
      }, 0);
      return { knowledge, count };
    });

    const avgKnowledgeCount = knowledgeCounts.reduce((sum, k) => sum + k.count, 0) / knowledgeCounts.length;
    
    knowledgeCounts.forEach(({ knowledge, count }) => {
      const deviation = Math.abs(count - avgKnowledgeCount) / avgKnowledgeCount;
      if (deviation > 0.5) {
        imbalances.push({
          type: 'knowledge_distribution',
          description: `${knowledge} dimension has ${count} questions`,
          severity: deviation > 0.8 ? 'high' : 'medium'
        });
      }
    });

    // Check for empty cells
    const emptyCells = matrix.gaps.filter(gap => gap.severity === 'high').length;
    if (emptyCells > 0) {
      imbalances.push({
        type: 'coverage_gaps',
        description: `${emptyCells} taxonomy cells have no questions`,
        severity: 'high'
      });
      recommendations.push('Focus on creating questions for empty taxonomy cells');
    }

    const isBalanced = imbalances.filter(i => i.severity === 'high').length === 0;

    return {
      isBalanced,
      imbalances,
      recommendations
    };
  }

  static generateRecommendations(matrix: TaxonomyMatrix): string[] {
    const recommendations: string[] = [];
    const analysis = this.analyzeBalance(matrix);
    
    recommendations.push(...analysis.recommendations);

    // Quality-based recommendations
    const lowQualityCells = matrix.cells.flat().filter(cell => 
      cell.questionCount > 0 && cell.averageQuality < 0.6
    );
    
    if (lowQualityCells.length > 0) {
      recommendations.push('Review and improve questions in cells with low quality scores');
    }

    // Confidence-based recommendations
    const lowConfidenceCells = matrix.cells.flat().filter(cell =>
      cell.questionCount > 0 && cell.averageConfidence < 0.7
    );
    
    if (lowConfidenceCells.length > 0) {
      recommendations.push('Validate AI classifications for questions with low confidence scores');
    }

    return recommendations;
  }
}