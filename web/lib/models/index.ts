import nsf from "../../data/models/nsf_sbir_phase_i.json"

export type ModelSection = {
  key: string
  title: string
  about?: string
  prompt?: string
  fields?: string[]
  limits?: { minWords?: number; maxWords?: number }
}

export type GrantModel = {
  slug: string
  name: string
  agency?: string
  program?: string
  sections: ModelSection[]
}

const MODELS: GrantModel[] = [nsf as GrantModel]

export function listModels() {
  return MODELS.map(({ slug, name }) => ({ slug, name }))
}

export function getModel(slug: string) {
  return MODELS.find((model) => model.slug === slug)
}
