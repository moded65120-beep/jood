// Vite serves JSON as JavaScript modules, so native JSON import attributes
// must not be used here.
// Vite emits one on-demand chunk per official sex/indicator dataset.
const loaders = {
  'wfa-male': () => import('../data/who/reference/wfa-male.json'),
  'wfa-female': () => import('../data/who/reference/wfa-female.json'),
  'lhfa-male': () => import('../data/who/reference/lhfa-male.json'),
  'lhfa-female': () => import('../data/who/reference/lhfa-female.json'),
  'hcfa-male': () => import('../data/who/reference/hcfa-male.json'),
  'hcfa-female': () => import('../data/who/reference/hcfa-female.json'),
}
const cache = new Map()

export function loadWhoReference(indicator, sex) {
  const key = `${indicator}-${sex}`
  if (!loaders[key]) return Promise.reject(new Error('Unsupported WHO indicator or sex'))
  if (!cache.has(key)) {
    cache.set(key, loaders[key]().then((module) => module.default).catch((error) => { cache.delete(key); throw error }))
  }
  return cache.get(key)
}
