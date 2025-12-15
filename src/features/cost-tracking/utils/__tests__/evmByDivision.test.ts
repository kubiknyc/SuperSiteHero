/**
 * EVM by Division Calculation Tests
 *
 * Tests for aggregating EVM metrics by cost code division,
 * weighted calculations, and division-level forecasting.
 */

import { describe, it, expect } from 'vitest';
import {
  aggregateByDivision,
  calculateDivisionMetrics,
  createEmptyDivisionMetrics,
  calculateWeightedCPI,
  calculateWeightedSPI,
  calculateEVWeightedCPI,
  calculateACWeightedCPI,
  calculateDivisionForecasts,
  findProblematicDivisions,
  findTopVarianceContributors,
  calculateProjectTotalsFromDivisions,
  compareDivisionToProject,
  type CostCodeEVMData,
  type DivisionEVMMetrics,
} from '../evmByDivision';

// ============================================================================
// TEST DATA
// ============================================================================

/**
 * Sample cost codes across multiple divisions
 */
const sampleCostCodes: CostCodeEVMData[] = [
  // Division 03 - Concrete (3 cost codes)
  {
    costCodeId: 'cc-1',
    costCode: '03 11 00',
    division: '03',
    divisionName: 'Concrete',
    BAC: 200000,
    PV: 100000,
    EV: 90000,    // 90% of planned work done (behind)
    AC: 95000,    // Spent $95k for $90k of work (over budget)
  },
  {
    costCodeId: 'cc-2',
    costCode: '03 20 00',
    division: '03',
    divisionName: 'Concrete',
    BAC: 150000,
    PV: 75000,
    EV: 75000,    // On schedule
    AC: 70000,    // Under budget
  },
  {
    costCodeId: 'cc-3',
    costCode: '03 30 00',
    division: '03',
    divisionName: 'Concrete',
    BAC: 100000,
    PV: 50000,
    EV: 55000,    // Ahead of schedule
    AC: 50000,    // On budget for work done
  },

  // Division 05 - Metals (2 cost codes)
  {
    costCodeId: 'cc-4',
    costCode: '05 12 00',
    division: '05',
    divisionName: 'Metals',
    BAC: 300000,
    PV: 150000,
    EV: 120000,   // Behind schedule
    AC: 160000,   // Over budget
  },
  {
    costCodeId: 'cc-5',
    costCode: '05 21 00',
    division: '05',
    divisionName: 'Metals',
    BAC: 200000,
    PV: 100000,
    EV: 110000,   // Ahead of schedule
    AC: 100000,   // On budget
  },

  // Division 26 - Electrical (1 cost code, excellent performance)
  {
    costCodeId: 'cc-6',
    costCode: '26 05 00',
    division: '26',
    divisionName: 'Electrical',
    BAC: 500000,
    PV: 250000,
    EV: 275000,   // 10% ahead
    AC: 240000,   // Under budget
  },

  // Division 31 - Earthwork (1 cost code, critical performance)
  {
    costCodeId: 'cc-7',
    costCode: '31 23 00',
    division: '31',
    divisionName: 'Earthwork',
    BAC: 400000,
    PV: 200000,
    EV: 140000,   // 30% behind
    AC: 200000,   // Used full budget for less work
  },
];

/**
 * Helper to create simple test data
 */
function createTestCostCode(
  id: string,
  division: string,
  divisionName: string,
  bac: number,
  pv: number,
  ev: number,
  ac: number
): CostCodeEVMData {
  return {
    costCodeId: id,
    costCode: `${division} 00 00`,
    division,
    divisionName,
    BAC: bac,
    PV: pv,
    EV: ev,
    AC: ac,
  };
}

// ============================================================================
// AGGREGATION TESTS
// ============================================================================

describe('Division Aggregation', () => {
  describe('aggregateByDivision', () => {
    it('should correctly group cost codes by division', () => {
      const result = aggregateByDivision(sampleCostCodes);

      expect(result).toHaveLength(4); // 4 divisions
      expect(result.map(d => d.division).sort()).toEqual(['03', '05', '26', '31']);
    });

    it('should sort results by division code', () => {
      const result = aggregateByDivision(sampleCostCodes);

      expect(result[0].division).toBe('03');
      expect(result[1].division).toBe('05');
      expect(result[2].division).toBe('26');
      expect(result[3].division).toBe('31');
    });

    it('should sum BAC correctly for each division', () => {
      const result = aggregateByDivision(sampleCostCodes);

      // Division 03: 200000 + 150000 + 100000 = 450000
      const div03 = result.find(d => d.division === '03')!;
      expect(div03.BAC).toBe(450000);

      // Division 05: 300000 + 200000 = 500000
      const div05 = result.find(d => d.division === '05')!;
      expect(div05.BAC).toBe(500000);

      // Division 26: 500000
      const div26 = result.find(d => d.division === '26')!;
      expect(div26.BAC).toBe(500000);

      // Division 31: 400000
      const div31 = result.find(d => d.division === '31')!;
      expect(div31.BAC).toBe(400000);
    });

    it('should sum PV, EV, AC correctly', () => {
      const result = aggregateByDivision(sampleCostCodes);

      // Division 03: PV = 100000 + 75000 + 50000 = 225000
      // EV = 90000 + 75000 + 55000 = 220000
      // AC = 95000 + 70000 + 50000 = 215000
      const div03 = result.find(d => d.division === '03')!;
      expect(div03.PV).toBe(225000);
      expect(div03.EV).toBe(220000);
      expect(div03.AC).toBe(215000);
    });

    it('should calculate CPI correctly from aggregated values', () => {
      const result = aggregateByDivision(sampleCostCodes);

      // Division 03: CPI = EV / AC = 220000 / 215000 = 1.023
      const div03 = result.find(d => d.division === '03')!;
      expect(div03.CPI).toBeCloseTo(1.023, 2);

      // Division 31: CPI = 140000 / 200000 = 0.7
      const div31 = result.find(d => d.division === '31')!;
      expect(div31.CPI).toBeCloseTo(0.7, 2);
    });

    it('should calculate SPI correctly from aggregated values', () => {
      const result = aggregateByDivision(sampleCostCodes);

      // Division 03: SPI = EV / PV = 220000 / 225000 = 0.978
      const div03 = result.find(d => d.division === '03')!;
      expect(div03.SPI).toBeCloseTo(0.978, 2);

      // Division 26: SPI = 275000 / 250000 = 1.1
      const div26 = result.find(d => d.division === '26')!;
      expect(div26.SPI).toBeCloseTo(1.1, 2);
    });

    it('should calculate CV and SV correctly', () => {
      const result = aggregateByDivision(sampleCostCodes);

      // Division 03: CV = EV - AC = 220000 - 215000 = 5000
      // SV = EV - PV = 220000 - 225000 = -5000
      const div03 = result.find(d => d.division === '03')!;
      expect(div03.CV).toBe(5000);
      expect(div03.SV).toBe(-5000);
    });

    it('should count cost codes per division', () => {
      const result = aggregateByDivision(sampleCostCodes);

      const div03 = result.find(d => d.division === '03')!;
      expect(div03.costCodeCount).toBe(3);

      const div05 = result.find(d => d.division === '05')!;
      expect(div05.costCodeCount).toBe(2);

      const div26 = result.find(d => d.division === '26')!;
      expect(div26.costCodeCount).toBe(1);
    });

    it('should handle empty input', () => {
      const result = aggregateByDivision([]);
      expect(result).toHaveLength(0);
    });

    it('should handle single cost code', () => {
      const single = [sampleCostCodes[0]];
      const result = aggregateByDivision(single);

      expect(result).toHaveLength(1);
      expect(result[0].BAC).toBe(200000);
      expect(result[0].costCodeCount).toBe(1);
    });
  });

  describe('calculateDivisionMetrics', () => {
    it('should return empty metrics for empty input', () => {
      const result = calculateDivisionMetrics([]);

      expect(result.division).toBe('');
      expect(result.BAC).toBe(0);
      expect(result.CPI).toBe(0);
      expect(result.costCodeCount).toBe(0);
    });

    it('should calculate percent complete correctly', () => {
      const codes = [
        createTestCostCode('1', '03', 'Concrete', 1000000, 500000, 450000, 480000),
      ];
      const result = calculateDivisionMetrics(codes);

      // percent_complete = (EV / BAC) * 100 = (450000 / 1000000) * 100 = 45%
      expect(result.percent_complete).toBeCloseTo(45, 2);
    });

    it('should assign correct performance status', () => {
      // Create a critical division (CPI < 0.9)
      const criticalCodes = [
        createTestCostCode('1', '31', 'Earthwork', 400000, 200000, 140000, 200000),
      ];
      const criticalResult = calculateDivisionMetrics(criticalCodes);
      expect(criticalResult.cost_status).toBe('critical');
      expect(criticalResult.schedule_status).toBe('critical');

      // Create an excellent division (CPI > 1.05)
      const excellentCodes = [
        createTestCostCode('1', '26', 'Electrical', 500000, 250000, 275000, 240000),
      ];
      const excellentResult = calculateDivisionMetrics(excellentCodes);
      expect(excellentResult.cost_status).toBe('excellent');
      expect(excellentResult.schedule_status).toBe('excellent');
    });
  });

  describe('createEmptyDivisionMetrics', () => {
    it('should create metrics with all zeros', () => {
      const result = createEmptyDivisionMetrics('99', 'Test Division');

      expect(result.division).toBe('99');
      expect(result.division_name).toBe('Test Division');
      expect(result.BAC).toBe(0);
      expect(result.PV).toBe(0);
      expect(result.EV).toBe(0);
      expect(result.AC).toBe(0);
      expect(result.CV).toBe(0);
      expect(result.SV).toBe(0);
      expect(result.CPI).toBe(0);
      expect(result.SPI).toBe(0);
      expect(result.EAC).toBe(0);
      expect(result.percent_complete).toBe(0);
      expect(result.costCodeCount).toBe(0);
      expect(result.weightedCPI).toBe(0);
      expect(result.weightedSPI).toBe(0);
    });
  });
});

// ============================================================================
// WEIGHTED CALCULATION TESTS
// ============================================================================

describe('Weighted Index Calculations', () => {
  describe('calculateWeightedCPI', () => {
    it('should weight by BAC correctly', () => {
      // Two cost codes with different BAC and CPI
      // CC1: BAC = 800000, EV = 400000, AC = 500000 => CPI = 0.8
      // CC2: BAC = 200000, EV = 100000, AC = 80000  => CPI = 1.25
      // Weighted CPI = (800000 * 0.8 + 200000 * 1.25) / 1000000
      //              = (640000 + 250000) / 1000000 = 0.89
      const codes = [
        createTestCostCode('1', '03', 'Concrete', 800000, 400000, 400000, 500000),
        createTestCostCode('2', '03', 'Concrete', 200000, 100000, 100000, 80000),
      ];

      const weightedCPI = calculateWeightedCPI(codes);
      expect(weightedCPI).toBeCloseTo(0.89, 2);
    });

    it('should give more weight to larger budget items', () => {
      // Large item performing poorly, small item performing well
      const codes1 = [
        createTestCostCode('1', '03', 'Concrete', 900000, 450000, 400000, 500000), // CPI = 0.8
        createTestCostCode('2', '03', 'Concrete', 100000, 50000, 60000, 50000),    // CPI = 1.2
      ];

      // Small item performing poorly, large item performing well
      const codes2 = [
        createTestCostCode('1', '03', 'Concrete', 100000, 50000, 40000, 50000),    // CPI = 0.8
        createTestCostCode('2', '03', 'Concrete', 900000, 450000, 540000, 450000), // CPI = 1.2
      ];

      const weighted1 = calculateWeightedCPI(codes1);
      const weighted2 = calculateWeightedCPI(codes2);

      // First should be lower (worse) because large item is performing poorly
      expect(weighted1).toBeLessThan(weighted2);
      expect(weighted1).toBeLessThan(1.0);
      expect(weighted2).toBeGreaterThan(1.0);
    });

    it('should handle empty array', () => {
      expect(calculateWeightedCPI([])).toBe(0);
    });

    it('should handle zero BAC items', () => {
      const codes = [
        createTestCostCode('1', '03', 'Concrete', 0, 0, 0, 100),
        createTestCostCode('2', '03', 'Concrete', 100000, 50000, 50000, 50000),
      ];

      const weighted = calculateWeightedCPI(codes);
      // Should only consider the second code (CPI = 1.0)
      expect(weighted).toBeCloseTo(1.0, 2);
    });

    it('should handle infinite CPI values', () => {
      const codes = [
        createTestCostCode('1', '03', 'Concrete', 100000, 50000, 50000, 0), // CPI = Infinity
        createTestCostCode('2', '03', 'Concrete', 100000, 50000, 50000, 50000), // CPI = 1.0
      ];

      const weighted = calculateWeightedCPI(codes);
      // Should only include finite CPI in calculation
      expect(weighted).toBeCloseTo(1.0, 2);
    });
  });

  describe('calculateWeightedSPI', () => {
    it('should weight by BAC correctly', () => {
      const codes = [
        createTestCostCode('1', '03', 'Concrete', 600000, 300000, 270000, 300000), // SPI = 0.9
        createTestCostCode('2', '03', 'Concrete', 400000, 200000, 240000, 200000), // SPI = 1.2
      ];

      // Weighted SPI = (600000 * 0.9 + 400000 * 1.2) / 1000000
      //              = (540000 + 480000) / 1000000 = 1.02
      const weightedSPI = calculateWeightedSPI(codes);
      expect(weightedSPI).toBeCloseTo(1.02, 2);
    });

    it('should handle empty array', () => {
      expect(calculateWeightedSPI([])).toBe(0);
    });
  });

  describe('calculateEVWeightedCPI', () => {
    it('should weight by earned value', () => {
      // High EV item with good CPI should dominate
      const codes = [
        createTestCostCode('1', '03', 'Concrete', 500000, 250000, 200000, 250000), // CPI = 0.8, EV = 200000
        createTestCostCode('2', '03', 'Concrete', 500000, 250000, 100000, 80000),  // CPI = 1.25, EV = 100000
      ];

      // EV-weighted = (200000 * 0.8 + 100000 * 1.25) / 300000
      //             = (160000 + 125000) / 300000 = 0.95
      const weighted = calculateEVWeightedCPI(codes);
      expect(weighted).toBeCloseTo(0.95, 2);
    });

    it('should handle zero EV items', () => {
      const codes = [
        createTestCostCode('1', '03', 'Concrete', 500000, 250000, 0, 100000), // No EV
        createTestCostCode('2', '03', 'Concrete', 500000, 250000, 250000, 250000), // CPI = 1.0
      ];

      const weighted = calculateEVWeightedCPI(codes);
      expect(weighted).toBeCloseTo(1.0, 2);
    });
  });

  describe('calculateACWeightedCPI', () => {
    it('should weight by actual cost', () => {
      // High AC item with poor CPI should dominate
      const codes = [
        createTestCostCode('1', '03', 'Concrete', 500000, 250000, 200000, 300000), // CPI = 0.67, AC = 300000
        createTestCostCode('2', '03', 'Concrete', 500000, 250000, 200000, 100000), // CPI = 2.0, AC = 100000
      ];

      // AC-weighted = (300000 * 0.67 + 100000 * 2.0) / 400000
      //             = (201000 + 200000) / 400000 = 1.0025
      const weighted = calculateACWeightedCPI(codes);
      expect(weighted).toBeCloseTo(1.0, 1);
    });

    it('should handle zero AC items', () => {
      const codes = [
        createTestCostCode('1', '03', 'Concrete', 500000, 0, 100000, 0), // No AC
        createTestCostCode('2', '03', 'Concrete', 500000, 250000, 250000, 200000), // CPI = 1.25
      ];

      const weighted = calculateACWeightedCPI(codes);
      expect(weighted).toBeCloseTo(1.25, 2);
    });
  });
});

// ============================================================================
// FORECASTING TESTS
// ============================================================================

describe('Division Forecasting', () => {
  describe('calculateDivisionForecasts', () => {
    it('should calculate EAC variants for each division', () => {
      const divisions = aggregateByDivision(sampleCostCodes);
      const forecasts = calculateDivisionForecasts(divisions);

      expect(forecasts).toHaveLength(4);
      forecasts.forEach(forecast => {
        expect(forecast).toHaveProperty('EAC_CPI');
        expect(forecast).toHaveProperty('EAC_SPI');
        expect(forecast).toHaveProperty('EAC_CSI');
        expect(forecast).toHaveProperty('VAC_CPI');
        expect(forecast).toHaveProperty('percentVariance');
      });
    });

    it('should calculate EAC_CPI correctly', () => {
      const divisions: DivisionEVMMetrics[] = [
        {
          division: '03',
          division_name: 'Concrete',
          BAC: 1000000,
          PV: 500000,
          EV: 450000,
          AC: 500000,
          CV: -50000,
          SV: -50000,
          CPI: 0.9,
          SPI: 0.9,
          EAC: 1111111,
          percent_complete: 45,
          cost_status: 'poor',
          schedule_status: 'poor',
          costCodeCount: 5,
          weightedCPI: 0.9,
          weightedSPI: 0.9,
        },
      ];

      const forecasts = calculateDivisionForecasts(divisions);
      // EAC_CPI = BAC / CPI = 1000000 / 0.9 = 1,111,111
      expect(forecasts[0].EAC_CPI).toBeCloseTo(1111111, 0);
    });

    it('should calculate EAC_CSI correctly', () => {
      const divisions: DivisionEVMMetrics[] = [
        {
          division: '03',
          division_name: 'Concrete',
          BAC: 1000000,
          PV: 500000,
          EV: 450000,
          AC: 500000,
          CV: -50000,
          SV: -50000,
          CPI: 0.9,
          SPI: 0.9,
          EAC: 1111111,
          percent_complete: 45,
          cost_status: 'poor',
          schedule_status: 'poor',
          costCodeCount: 5,
          weightedCPI: 0.9,
          weightedSPI: 0.9,
        },
      ];

      const forecasts = calculateDivisionForecasts(divisions);
      // EAC_CSI = AC + (BAC - EV) / (CPI * SPI)
      //         = 500000 + (1000000 - 450000) / (0.9 * 0.9)
      //         = 500000 + 550000 / 0.81 = 500000 + 679012 = 1,179,012
      expect(forecasts[0].EAC_CSI).toBeCloseTo(1179012, 0);
    });

    it('should calculate VAC and percentVariance correctly', () => {
      const divisions: DivisionEVMMetrics[] = [
        {
          division: '03',
          division_name: 'Concrete',
          BAC: 1000000,
          PV: 500000,
          EV: 500000,
          AC: 400000,
          CV: 100000,
          SV: 0,
          CPI: 1.25,
          SPI: 1.0,
          EAC: 800000,
          percent_complete: 50,
          cost_status: 'excellent',
          schedule_status: 'good',
          costCodeCount: 5,
          weightedCPI: 1.25,
          weightedSPI: 1.0,
        },
      ];

      const forecasts = calculateDivisionForecasts(divisions);
      // EAC_CPI = 1000000 / 1.25 = 800000
      // VAC = BAC - EAC = 1000000 - 800000 = 200000
      // percentVariance = (800000 - 1000000) / 1000000 * 100 = -20%
      expect(forecasts[0].VAC_CPI).toBeCloseTo(200000, 0);
      expect(forecasts[0].percentVariance).toBeCloseTo(-20, 1);
    });

    it('should handle zero CPI gracefully', () => {
      const divisions: DivisionEVMMetrics[] = [
        {
          division: '03',
          division_name: 'Concrete',
          BAC: 1000000,
          PV: 500000,
          EV: 0,
          AC: 500000,
          CV: -500000,
          SV: -500000,
          CPI: 0,
          SPI: 0,
          EAC: 1000000,
          percent_complete: 0,
          cost_status: 'critical',
          schedule_status: 'critical',
          costCodeCount: 5,
          weightedCPI: 0,
          weightedSPI: 0,
        },
      ];

      const forecasts = calculateDivisionForecasts(divisions);
      // When CPI = 0, EAC should default to BAC
      expect(forecasts[0].EAC_CPI).toBe(1000000);
    });

    it('should handle non-finite EAC values', () => {
      const divisions: DivisionEVMMetrics[] = [
        {
          division: '03',
          division_name: 'Concrete',
          BAC: 1000000,
          PV: 500000,
          EV: 100000,
          AC: 500000,
          CV: -400000,
          SV: -400000,
          CPI: 0.001,  // Very low CPI will cause near-infinite EAC
          SPI: 0.001,
          EAC: Infinity,
          percent_complete: 10,
          cost_status: 'critical',
          schedule_status: 'critical',
          costCodeCount: 5,
          weightedCPI: 0.001,
          weightedSPI: 0.001,
        },
      ];

      const forecasts = calculateDivisionForecasts(divisions);
      // Non-finite values should be capped to BAC
      expect(isFinite(forecasts[0].EAC_CPI)).toBe(true);
      expect(isFinite(forecasts[0].EAC_SPI)).toBe(true);
      expect(isFinite(forecasts[0].EAC_CSI)).toBe(true);
    });

    it('should handle zero SPI separately from zero CPI', () => {
      const divisions: DivisionEVMMetrics[] = [
        {
          division: '05',
          division_name: 'Metals',
          BAC: 500000,
          PV: 250000,
          EV: 0,
          AC: 100000,
          CV: -100000,
          SV: -250000,
          CPI: 0,      // Zero CPI - no earned value
          SPI: 0,      // Zero SPI
          EAC: 500000,
          percent_complete: 0,
          cost_status: 'critical',
          schedule_status: 'critical',
          costCodeCount: 2,
          weightedCPI: 0,
          weightedSPI: 0,
        },
      ];

      const forecasts = calculateDivisionForecasts(divisions);
      // Both should default to BAC when indices are 0
      expect(forecasts[0].EAC_SPI).toBe(500000);
      expect(forecasts[0].EAC_CSI).toBe(500000);
    });

    it('should calculate variance percentage as 0 when BAC is 0', () => {
      const divisions: DivisionEVMMetrics[] = [
        {
          division: '99',
          division_name: 'Zero Budget',
          BAC: 0,
          PV: 0,
          EV: 0,
          AC: 0,
          CV: 0,
          SV: 0,
          CPI: 0,
          SPI: 0,
          EAC: 0,
          percent_complete: 0,
          cost_status: 'critical',
          schedule_status: 'critical',
          costCodeCount: 1,
          weightedCPI: 0,
          weightedSPI: 0,
        },
      ];

      const forecasts = calculateDivisionForecasts(divisions);
      expect(forecasts[0].percentVariance).toBe(0);
    });

    it('should handle VAC being non-finite', () => {
      // When EAC_CPI is very close to BAC, VAC should still be finite
      const divisions: DivisionEVMMetrics[] = [
        {
          division: '03',
          division_name: 'Concrete',
          BAC: 1000000,
          PV: 500000,
          EV: 500000,
          AC: 500000,
          CV: 0,
          SV: 0,
          CPI: 1.0,
          SPI: 1.0,
          EAC: 1000000,
          percent_complete: 50,
          cost_status: 'good',
          schedule_status: 'good',
          costCodeCount: 3,
          weightedCPI: 1.0,
          weightedSPI: 1.0,
        },
      ];

      const forecasts = calculateDivisionForecasts(divisions);
      expect(isFinite(forecasts[0].VAC_CPI)).toBe(true);
      expect(forecasts[0].VAC_CPI).toBe(0);  // BAC - BAC = 0
    });

    it('should handle Infinity CPI (BAC/Infinity = 0)', () => {
      // When CPI is Infinity, BAC / Infinity = 0, which is finite
      // This tests the actual calculation behavior
      const divisions: DivisionEVMMetrics[] = [
        {
          division: '03',
          division_name: 'Concrete',
          BAC: 1000000,
          PV: 500000,
          EV: 100000,
          AC: 100000,
          CV: 0,
          SV: -400000,
          CPI: Infinity,  // Infinity CPI means "free" work
          SPI: 0.2,
          EAC: 1000000,
          percent_complete: 10,
          cost_status: 'critical',
          schedule_status: 'critical',
          costCodeCount: 3,
          weightedCPI: Infinity,
          weightedSPI: 0.2,
        },
      ];

      const forecasts = calculateDivisionForecasts(divisions);
      // With Infinity CPI, BAC / Infinity = 0 (technically "free")
      expect(forecasts[0].EAC_CPI).toBe(0);
      expect(isFinite(forecasts[0].EAC_CPI)).toBe(true);
    });

    it('should handle NaN CPI (falls back to BAC)', () => {
      // Test case with NaN CPI which is not > 0
      const divisions: DivisionEVMMetrics[] = [
        {
          division: '03',
          division_name: 'Concrete',
          BAC: 1000000,
          PV: 500000,
          EV: 100000,
          AC: 100000,
          CV: 0,
          SV: -400000,
          CPI: NaN,  // NaN CPI means invalid calculation
          SPI: 0.2,
          EAC: 1000000,
          percent_complete: 10,
          cost_status: 'critical',
          schedule_status: 'critical',
          costCodeCount: 3,
          weightedCPI: NaN,
          weightedSPI: 0.2,
        },
      ];

      const forecasts = calculateDivisionForecasts(divisions);
      // With NaN CPI (NaN > 0 is false), EAC defaults to BAC
      expect(forecasts[0].EAC_CPI).toBe(1000000);
    });
  });
});

// ============================================================================
// ANALYSIS FUNCTION TESTS
// ============================================================================

describe('Division Analysis Functions', () => {
  describe('findProblematicDivisions', () => {
    it('should identify divisions below threshold', () => {
      const divisions = aggregateByDivision(sampleCostCodes);
      const problematic = findProblematicDivisions(divisions, 0.95, 0.95);

      // Division 31 (Earthwork) should definitely be flagged (CPI = 0.7, SPI = 0.7)
      const earthwork = problematic.find(d => d.division === '31');
      expect(earthwork).toBeDefined();
    });

    it('should sort by CSI (worst first)', () => {
      const divisions = aggregateByDivision(sampleCostCodes);
      const problematic = findProblematicDivisions(divisions, 0.95, 0.95);

      if (problematic.length > 1) {
        // First item should have lower CSI than second
        const csi0 = problematic[0].CPI * problematic[0].SPI;
        const csi1 = problematic[1].CPI * problematic[1].SPI;
        expect(csi0).toBeLessThanOrEqual(csi1);
      }
    });

    it('should return empty array if all divisions perform well', () => {
      const goodDivisions: DivisionEVMMetrics[] = [
        {
          division: '03',
          division_name: 'Concrete',
          BAC: 1000000,
          PV: 500000,
          EV: 550000,
          AC: 480000,
          CV: 70000,
          SV: 50000,
          CPI: 1.15,
          SPI: 1.1,
          EAC: 869565,
          percent_complete: 55,
          cost_status: 'excellent',
          schedule_status: 'excellent',
          costCodeCount: 5,
          weightedCPI: 1.15,
          weightedSPI: 1.1,
        },
      ];

      const problematic = findProblematicDivisions(goodDivisions, 0.95, 0.95);
      expect(problematic).toHaveLength(0);
    });

    it('should use custom thresholds', () => {
      const divisions = aggregateByDivision(sampleCostCodes);

      // With strict threshold of 1.0, more divisions should be flagged
      const strict = findProblematicDivisions(divisions, 1.0, 1.0);

      // With lenient threshold of 0.8, fewer divisions should be flagged
      const lenient = findProblematicDivisions(divisions, 0.8, 0.8);

      expect(strict.length).toBeGreaterThanOrEqual(lenient.length);
    });
  });

  describe('findTopVarianceContributors', () => {
    it('should sort by absolute CV value', () => {
      const divisions = aggregateByDivision(sampleCostCodes);
      const sorted = findTopVarianceContributors(divisions);

      // Should be sorted by |CV| descending
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(Math.abs(sorted[i].CV)).toBeGreaterThanOrEqual(Math.abs(sorted[i + 1].CV));
      }
    });

    it('should include both positive and negative variances', () => {
      const divisions: DivisionEVMMetrics[] = [
        {
          division: '03',
          division_name: 'Concrete',
          BAC: 500000,
          PV: 250000,
          EV: 200000,
          AC: 300000,
          CV: -100000, // Over budget
          SV: -50000,
          CPI: 0.67,
          SPI: 0.8,
          EAC: 750000,
          percent_complete: 40,
          cost_status: 'critical',
          schedule_status: 'critical',
          costCodeCount: 3,
          weightedCPI: 0.67,
          weightedSPI: 0.8,
        },
        {
          division: '26',
          division_name: 'Electrical',
          BAC: 500000,
          PV: 250000,
          EV: 300000,
          AC: 200000,
          CV: 100000, // Under budget
          SV: 50000,
          CPI: 1.5,
          SPI: 1.2,
          EAC: 333333,
          percent_complete: 60,
          cost_status: 'excellent',
          schedule_status: 'excellent',
          costCodeCount: 2,
          weightedCPI: 1.5,
          weightedSPI: 1.2,
        },
      ];

      const sorted = findTopVarianceContributors(divisions);
      // Both should be tied for |CV| = 100000
      expect(sorted).toHaveLength(2);
      expect(Math.abs(sorted[0].CV)).toBe(100000);
      expect(Math.abs(sorted[1].CV)).toBe(100000);
    });
  });

  describe('calculateProjectTotalsFromDivisions', () => {
    it('should sum all division values correctly', () => {
      const divisions = aggregateByDivision(sampleCostCodes);
      const totals = calculateProjectTotalsFromDivisions(divisions);

      // Total BAC = 450000 + 500000 + 500000 + 400000 = 1,850,000
      expect(totals.totalBAC).toBe(1850000);

      // Total cost codes = 3 + 2 + 1 + 1 = 7
      expect(totals.totalCostCodes).toBe(7);
    });

    it('should calculate project-level indices correctly', () => {
      const divisions = aggregateByDivision(sampleCostCodes);
      const totals = calculateProjectTotalsFromDivisions(divisions);

      // Project CPI = totalEV / totalAC
      // Project SPI = totalEV / totalPV
      expect(totals.projectCPI).toBeGreaterThan(0);
      expect(totals.projectSPI).toBeGreaterThan(0);
      expect(totals.projectCSI).toBe(totals.projectCPI * totals.projectSPI);
    });

    it('should handle empty array', () => {
      const totals = calculateProjectTotalsFromDivisions([]);

      expect(totals.totalBAC).toBe(0);
      expect(totals.projectCPI).toBe(0);
      expect(totals.projectSPI).toBe(0);
      expect(totals.totalCostCodes).toBe(0);
    });

    it('should handle non-finite project indices', () => {
      // Division with zero AC and PV will cause Infinity CPI/SPI
      const divisions: DivisionEVMMetrics[] = [
        {
          division: '03',
          division_name: 'Concrete',
          BAC: 500000,
          PV: 0,       // Zero PV
          EV: 100000,
          AC: 0,       // Zero AC
          CV: 100000,
          SV: 100000,
          CPI: Infinity,
          SPI: Infinity,
          EAC: 0,
          percent_complete: 20,
          cost_status: 'excellent',
          schedule_status: 'excellent',
          costCodeCount: 3,
          weightedCPI: Infinity,
          weightedSPI: Infinity,
        },
      ];

      const totals = calculateProjectTotalsFromDivisions(divisions);
      // Non-finite values should be replaced with 0
      expect(totals.projectCPI).toBe(0);
      expect(totals.projectSPI).toBe(0);
      expect(totals.projectCSI).toBe(0);
    });
  });

  describe('compareDivisionToProject', () => {
    it('should calculate variance from project correctly', () => {
      const division: DivisionEVMMetrics = {
        division: '03',
        division_name: 'Concrete',
        BAC: 500000,
        PV: 250000,
        EV: 275000,
        AC: 240000,
        CV: 35000,
        SV: 25000,
        CPI: 1.15,
        SPI: 1.1,
        EAC: 434783,
        percent_complete: 55,
        cost_status: 'excellent',
        schedule_status: 'excellent',
        costCodeCount: 3,
        weightedCPI: 1.15,
        weightedSPI: 1.1,
      };

      const comparison = compareDivisionToProject(division, 1.0, 1.0);

      expect(comparison.cpiVarianceFromProject).toBeCloseTo(0.15, 2);
      expect(comparison.spiVarianceFromProject).toBeCloseTo(0.1, 2);
      expect(comparison.isAboveAverageCost).toBe(true);
      expect(comparison.isAboveAverageSchedule).toBe(true);
    });

    it('should assign correct performance rating', () => {
      const excellentDiv: DivisionEVMMetrics = {
        division: '26',
        division_name: 'Electrical',
        BAC: 500000,
        PV: 250000,
        EV: 300000,
        AC: 240000,
        CV: 60000,
        SV: 50000,
        CPI: 1.25,
        SPI: 1.2,
        EAC: 400000,
        percent_complete: 60,
        cost_status: 'excellent',
        schedule_status: 'excellent',
        costCodeCount: 2,
        weightedCPI: 1.25,
        weightedSPI: 1.2,
      };

      const excellentComparison = compareDivisionToProject(excellentDiv, 1.0, 1.0);
      expect(excellentComparison.performanceRating).toBe('excellent');

      const criticalDiv: DivisionEVMMetrics = {
        division: '31',
        division_name: 'Earthwork',
        BAC: 400000,
        PV: 200000,
        EV: 140000,
        AC: 200000,
        CV: -60000,
        SV: -60000,
        CPI: 0.7,
        SPI: 0.7,
        EAC: 571429,
        percent_complete: 35,
        cost_status: 'critical',
        schedule_status: 'critical',
        costCodeCount: 1,
        weightedCPI: 0.7,
        weightedSPI: 0.7,
      };

      const criticalComparison = compareDivisionToProject(criticalDiv, 1.0, 1.0);
      expect(criticalComparison.performanceRating).toBe('critical');
    });

    it('should identify below-average performance', () => {
      const belowAvgDiv: DivisionEVMMetrics = {
        division: '05',
        division_name: 'Metals',
        BAC: 500000,
        PV: 250000,
        EV: 220000,
        AC: 240000,
        CV: -20000,
        SV: -30000,
        CPI: 0.92,
        SPI: 0.88,
        EAC: 543478,
        percent_complete: 44,
        cost_status: 'poor',
        schedule_status: 'critical',
        costCodeCount: 2,
        weightedCPI: 0.92,
        weightedSPI: 0.88,
      };

      const comparison = compareDivisionToProject(belowAvgDiv, 1.0, 1.0);
      expect(comparison.isAboveAverageCost).toBe(false);
      expect(comparison.isAboveAverageSchedule).toBe(false);
      expect(['below-average', 'critical']).toContain(comparison.performanceRating);
    });

    it('should assign good rating when slightly above project average', () => {
      // CPI/SPI variance >= 0 but < 0.1 should be "good"
      const goodDiv: DivisionEVMMetrics = {
        division: '03',
        division_name: 'Concrete',
        BAC: 500000,
        PV: 250000,
        EV: 260000,
        AC: 250000,
        CV: 10000,
        SV: 10000,
        CPI: 1.04,  // +0.04 variance from project
        SPI: 1.04,  // +0.04 variance from project
        EAC: 480769,
        percent_complete: 52,
        cost_status: 'good',
        schedule_status: 'good',
        costCodeCount: 3,
        weightedCPI: 1.04,
        weightedSPI: 1.04,
      };

      const comparison = compareDivisionToProject(goodDiv, 1.0, 1.0);
      expect(comparison.performanceRating).toBe('good');
      expect(comparison.cpiVarianceFromProject).toBeCloseTo(0.04, 2);
      expect(comparison.spiVarianceFromProject).toBeCloseTo(0.04, 2);
    });

    it('should assign average rating when slightly below project average', () => {
      // CPI/SPI variance >= -0.05 but < 0 should be "average"
      const avgDiv: DivisionEVMMetrics = {
        division: '05',
        division_name: 'Metals',
        BAC: 500000,
        PV: 250000,
        EV: 240000,
        AC: 252000,
        CV: -12000,
        SV: -10000,
        CPI: 0.97,  // -0.03 variance from project
        SPI: 0.96,  // -0.04 variance from project
        EAC: 515464,
        percent_complete: 48,
        cost_status: 'fair',
        schedule_status: 'fair',
        costCodeCount: 2,
        weightedCPI: 0.97,
        weightedSPI: 0.96,
      };

      const comparison = compareDivisionToProject(avgDiv, 1.0, 1.0);
      expect(comparison.performanceRating).toBe('average');
      expect(comparison.cpiVarianceFromProject).toBeCloseTo(-0.03, 2);
      expect(comparison.spiVarianceFromProject).toBeCloseTo(-0.04, 2);
    });

    it('should assign below-average rating when moderately below project average', () => {
      // CPI/SPI variance >= -0.1 but < -0.05 should be "below-average"
      const belowAvgDiv: DivisionEVMMetrics = {
        division: '07',
        division_name: 'Thermal Protection',
        BAC: 300000,
        PV: 150000,
        EV: 135000,
        AC: 150000,
        CV: -15000,
        SV: -15000,
        CPI: 0.93,  // -0.07 variance from project
        SPI: 0.92,  // -0.08 variance from project
        EAC: 322581,
        percent_complete: 45,
        cost_status: 'poor',
        schedule_status: 'poor',
        costCodeCount: 2,
        weightedCPI: 0.93,
        weightedSPI: 0.92,
      };

      const comparison = compareDivisionToProject(belowAvgDiv, 1.0, 1.0);
      expect(comparison.performanceRating).toBe('below-average');
      expect(comparison.cpiVarianceFromProject).toBeCloseTo(-0.07, 2);
      expect(comparison.spiVarianceFromProject).toBeCloseTo(-0.08, 2);
    });
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  it('should handle division with zero budget', () => {
    const codes = [
      createTestCostCode('1', '03', 'Concrete', 0, 0, 0, 0),
    ];

    const result = calculateDivisionMetrics(codes);
    expect(result.BAC).toBe(0);
    expect(result.percent_complete).toBe(0);
    expect(result.CPI).toBe(0);
    expect(result.SPI).toBe(0);
  });

  it('should handle division with zero work done', () => {
    const codes = [
      createTestCostCode('1', '03', 'Concrete', 1000000, 500000, 0, 0),
    ];

    const result = calculateDivisionMetrics(codes);
    expect(result.EV).toBe(0);
    expect(result.AC).toBe(0);
    expect(result.percent_complete).toBe(0);
  });

  it('should handle single cost code per division', () => {
    const codes = [
      createTestCostCode('1', '03', 'Concrete', 500000, 250000, 250000, 250000),
    ];

    const result = calculateDivisionMetrics(codes);
    expect(result.CPI).toBeCloseTo(1.0, 2);
    expect(result.SPI).toBeCloseTo(1.0, 2);
    expect(result.costCodeCount).toBe(1);
  });

  it('should handle many cost codes in single division', () => {
    const codes = Array.from({ length: 100 }, (_, i) =>
      createTestCostCode(
        `cc-${i}`,
        '03',
        'Concrete',
        10000, // BAC
        5000,  // PV
        5000 + (i % 3 - 1) * 500, // EV varies
        5000 + (i % 3 - 1) * 300, // AC varies
      )
    );

    const result = calculateDivisionMetrics(codes);
    expect(result.costCodeCount).toBe(100);
    expect(result.BAC).toBe(1000000); // 100 * 10000
    expect(isFinite(result.CPI)).toBe(true);
    expect(isFinite(result.SPI)).toBe(true);
  });
});
