export interface RfpSection {
  id: string;
  title: string;
  instructions: string;
  weight?: number;
  limitWords?: number;
  limitPages?: number;
}

export interface RfpNorm {
  programName?: string;
  funder?: string;
  deadline?: string;
  eligibilityNotes?: string;
  sections: RfpSection[];
}

export const EMPTY_RFP_NORM: RfpNorm = {
  sections: [],
};
